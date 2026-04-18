import { and, eq, inArray } from "drizzle-orm";
import { db } from "../db/client";
import {
  acceptedAnswers,
  answers,
  comments,
  questions,
  votes,
} from "../db/schema";
import {
  atUri,
  parseDate,
  type AcceptedAnswerRecord,
  type AnswerRecord,
  type CommentRecord,
  type JetstreamCommit,
  type QuestionRecord,
  type VoteRecord,
} from "./types";
import { isAsqCollection } from "./collections";
import {
  recomputeAnswerCount,
  recomputeCommentCount,
  recomputeScore,
} from "./recompute";

export async function handleCommit(
  did: string,
  commit: JetstreamCommit,
): Promise<void> {
  if (!isAsqCollection(commit.collection)) return;
  const uri = atUri(did, commit.collection, commit.rkey);

  switch (commit.collection) {
    case "fyi.asq.question":
      return commit.operation === "delete"
        ? deleteQuestion(uri)
        : upsertQuestion(did, uri, commit);
    case "fyi.asq.answer":
      return commit.operation === "delete"
        ? deleteAnswer(uri)
        : upsertAnswer(did, uri, commit);
    case "fyi.asq.comment":
      return commit.operation === "delete"
        ? deleteComment(uri)
        : upsertComment(did, uri, commit);
    case "fyi.asq.vote":
      return commit.operation === "delete"
        ? deleteVote(uri)
        : upsertVote(did, uri, commit);
    case "fyi.asq.acceptedAnswer":
      return commit.operation === "delete"
        ? deleteAcceptedAnswer(uri)
        : upsertAcceptedAnswer(did, uri, commit);
  }
}

// -------- question --------

async function upsertQuestion(
  did: string,
  uri: string,
  c: JetstreamCommit,
): Promise<void> {
  const rec = (c.record ?? {}) as QuestionRecord;
  if (typeof rec.title !== "string" || typeof rec.body !== "string") return;
  if (!c.cid) return;
  const createdAt = parseDate(rec.createdAt, new Date());
  const tags = Array.isArray(rec.tags)
    ? rec.tags.filter((t): t is string => typeof t === "string")
    : [];
  await db
    .insert(questions)
    .values({
      uri,
      cid: c.cid,
      authorDid: did,
      title: rec.title,
      body: rec.body,
      tags,
      createdAt,
    })
    .onConflictDoUpdate({
      target: questions.uri,
      set: {
        cid: c.cid,
        title: rec.title,
        body: rec.body,
        tags,
        createdAt,
      },
    });
}

async function deleteQuestion(uri: string): Promise<void> {
  // cascade: all answers/comments/votes/accepted referencing this question
  const answerRows = await db
    .select({ uri: answers.uri })
    .from(answers)
    .where(eq(answers.questionUri, uri));
  const answerUris = answerRows.map((r) => r.uri);

  await db.delete(acceptedAnswers).where(eq(acceptedAnswers.questionUri, uri));
  if (answerUris.length) {
    await db
      .delete(comments)
      .where(inArray(comments.subjectUri, [uri, ...answerUris]));
    await db
      .delete(votes)
      .where(inArray(votes.subjectUri, [uri, ...answerUris]));
  } else {
    await db.delete(comments).where(eq(comments.subjectUri, uri));
    await db.delete(votes).where(eq(votes.subjectUri, uri));
  }
  await db.delete(answers).where(eq(answers.questionUri, uri));
  await db.delete(questions).where(eq(questions.uri, uri));
}

// -------- answer --------

async function upsertAnswer(
  did: string,
  uri: string,
  c: JetstreamCommit,
): Promise<void> {
  const rec = (c.record ?? {}) as AnswerRecord;
  if (
    typeof rec.body !== "string" ||
    !rec.subject?.uri ||
    !rec.subject.cid ||
    !c.cid
  )
    return;
  const createdAt = parseDate(rec.createdAt, new Date());
  await db
    .insert(answers)
    .values({
      uri,
      cid: c.cid,
      authorDid: did,
      questionUri: rec.subject.uri,
      body: rec.body,
      createdAt,
    })
    .onConflictDoUpdate({
      target: answers.uri,
      set: {
        cid: c.cid,
        questionUri: rec.subject.uri,
        body: rec.body,
        createdAt,
      },
    });
  await recomputeAnswerCount(rec.subject.uri);
}

async function deleteAnswer(uri: string): Promise<void> {
  const existing = await db
    .select({ questionUri: answers.questionUri })
    .from(answers)
    .where(eq(answers.uri, uri))
    .limit(1);
  const questionUri = existing[0]?.questionUri;
  // Drop dependent records first
  await db.delete(comments).where(eq(comments.subjectUri, uri));
  await db.delete(votes).where(eq(votes.subjectUri, uri));
  // If this answer was accepted, clear it
  await db
    .update(questions)
    .set({ acceptedAnswerUri: null })
    .where(eq(questions.acceptedAnswerUri, uri));
  await db.delete(acceptedAnswers).where(eq(acceptedAnswers.answerUri, uri));
  await db.delete(answers).where(eq(answers.uri, uri));
  if (questionUri) await recomputeAnswerCount(questionUri);
}

// -------- comment --------

async function upsertComment(
  did: string,
  uri: string,
  c: JetstreamCommit,
): Promise<void> {
  const rec = (c.record ?? {}) as CommentRecord;
  if (
    typeof rec.body !== "string" ||
    !rec.subject?.uri ||
    !rec.subject.cid ||
    !c.cid
  )
    return;
  const createdAt = parseDate(rec.createdAt, new Date());
  await db
    .insert(comments)
    .values({
      uri,
      cid: c.cid,
      authorDid: did,
      subjectUri: rec.subject.uri,
      parentUri: rec.parent?.uri ?? null,
      body: rec.body,
      createdAt,
    })
    .onConflictDoUpdate({
      target: comments.uri,
      set: {
        cid: c.cid,
        subjectUri: rec.subject.uri,
        parentUri: rec.parent?.uri ?? null,
        body: rec.body,
        createdAt,
      },
    });
  await recomputeCommentCount(rec.subject.uri);
}

async function deleteComment(uri: string): Promise<void> {
  const existing = await db
    .select({ subjectUri: comments.subjectUri })
    .from(comments)
    .where(eq(comments.uri, uri))
    .limit(1);
  await db.delete(comments).where(eq(comments.uri, uri));
  const subject = existing[0]?.subjectUri;
  if (subject) await recomputeCommentCount(subject);
}

// -------- vote --------

async function upsertVote(
  did: string,
  uri: string,
  c: JetstreamCommit,
): Promise<void> {
  const rec = (c.record ?? {}) as VoteRecord;
  if (
    !rec.subject?.uri ||
    (rec.direction !== "up" && rec.direction !== "down")
  )
    return;
  const createdAt = parseDate(rec.createdAt, new Date());
  // Enforce uniqueness (authorDid, subjectUri): the PDS can end up with stale
  // votes from toggle flows where a client raced with the delete. Drop any
  // pre-existing vote row by the same voter on the same subject.
  await db
    .delete(votes)
    .where(
      and(
        eq(votes.authorDid, did),
        eq(votes.subjectUri, rec.subject.uri),
      ),
    );
  await db.insert(votes).values({
    uri,
    authorDid: did,
    subjectUri: rec.subject.uri,
    direction: rec.direction,
    createdAt,
  });
  await recomputeScore(rec.subject.uri);
}

async function deleteVote(uri: string): Promise<void> {
  const existing = await db
    .select({ subjectUri: votes.subjectUri })
    .from(votes)
    .where(eq(votes.uri, uri))
    .limit(1);
  await db.delete(votes).where(eq(votes.uri, uri));
  const subject = existing[0]?.subjectUri;
  if (subject) await recomputeScore(subject);
}

// -------- accepted answer --------

async function upsertAcceptedAnswer(
  did: string,
  uri: string,
  c: JetstreamCommit,
): Promise<void> {
  const rec = (c.record ?? {}) as AcceptedAnswerRecord;
  if (!rec.question?.uri || !rec.answer?.uri) return;
  const createdAt = parseDate(rec.createdAt, new Date());

  // Enforce the unique (questionUri) constraint by clearing any prior
  // accepted answer for this question before insert.
  await db
    .delete(acceptedAnswers)
    .where(eq(acceptedAnswers.questionUri, rec.question.uri));

  await db.insert(acceptedAnswers).values({
    uri,
    authorDid: did,
    questionUri: rec.question.uri,
    answerUri: rec.answer.uri,
    createdAt,
  });
  await db
    .update(questions)
    .set({ acceptedAnswerUri: rec.answer.uri })
    .where(eq(questions.uri, rec.question.uri));
}

async function deleteAcceptedAnswer(uri: string): Promise<void> {
  const existing = await db
    .select({
      questionUri: acceptedAnswers.questionUri,
      answerUri: acceptedAnswers.answerUri,
    })
    .from(acceptedAnswers)
    .where(eq(acceptedAnswers.uri, uri))
    .limit(1);
  await db.delete(acceptedAnswers).where(eq(acceptedAnswers.uri, uri));
  const row = existing[0];
  if (!row) return;
  // only clear if it still matches
  await db
    .update(questions)
    .set({ acceptedAnswerUri: null })
    .where(
      and(
        eq(questions.uri, row.questionUri),
        eq(questions.acceptedAnswerUri, row.answerUri),
      ),
    );
}
