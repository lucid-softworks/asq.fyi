import { aliasedTable, and, desc, eq, inArray, lt, or, sql } from "drizzle-orm";
import {
  answers,
  comments,
  profiles,
  questions,
  analyticsQuestionStats,
  votes,
} from "../schema";
import { db } from "../client";

export type QuestionSort =
  | "new"
  | "top"
  | "unanswered"
  | "trending"
  | "most_viewed"
  | "most_discussed";

export interface ProfileSummary {
  did: string;
  handle: string | null;
  displayName: string | null;
  avatarUrl: string | null;
}

export interface QuestionCard {
  uri: string;
  cid: string;
  author: ProfileSummary;
  title: string;
  body: string;
  tags: string[];
  score: number;
  answerCount: number;
  commentCount: number;
  createdAt: string;
  acceptedAnswerUri: string | null;
  views7d: number;
  views24h: number;
  viewsTotal: number;
  viewerVote: "up" | "down" | null;
}

export interface Cursor {
  k: string;
  u: string;
}

export function encodeCursor(c: Cursor): string {
  return Buffer.from(JSON.stringify(c), "utf8").toString("base64url");
}

export function decodeCursor(s: string | undefined): Cursor | null {
  if (!s) return null;
  try {
    const raw = Buffer.from(s, "base64url").toString("utf8");
    const parsed = JSON.parse(raw);
    if (typeof parsed?.k === "string" && typeof parsed?.u === "string") {
      return parsed;
    }
  } catch {
    /* fall through */
  }
  return null;
}

interface ListArgs {
  sort: QuestionSort;
  tag?: string;
  cursor?: string;
  limit: number;
  viewerDid?: string;
}

export async function listQuestions(args: ListArgs): Promise<{
  items: QuestionCard[];
  cursor: string | null;
}> {
  const viewerVotes = aliasedTable(votes, "viewer_votes");
  const cursor = decodeCursor(args.cursor);
  const conditions = [];

  if (args.tag) {
    conditions.push(sql`${questions.tags} @> ARRAY[${args.tag}]::text[]`);
  }
  if (args.sort === "unanswered") {
    conditions.push(eq(questions.answerCount, 0));
  }

  if (cursor) {
    if (args.sort === "top") {
      const score = Number(cursor.k);
      conditions.push(
        or(
          lt(questions.score, score),
          and(eq(questions.score, score), lt(questions.uri, cursor.u)),
        )!,
      );
    } else if (args.sort === "most_discussed") {
      const total = Number(cursor.k);
      conditions.push(
        or(
          lt(
            sql<number>`${questions.answerCount} + ${questions.commentCount}`,
            total,
          ),
          and(
            eq(
              sql<number>`${questions.answerCount} + ${questions.commentCount}`,
              total,
            ),
            lt(questions.uri, cursor.u),
          ),
        )!,
      );
    } else if (args.sort === "most_viewed" || args.sort === "trending") {
      // cursor key is views7d for most_viewed or trending score for trending
      const v = Number(cursor.k);
      conditions.push(
        or(
          lt(
            sql<number>`coalesce(${analyticsQuestionStats.views7d}, 0)`,
            v,
          ),
          and(
            eq(
              sql<number>`coalesce(${analyticsQuestionStats.views7d}, 0)`,
              v,
            ),
            lt(questions.uri, cursor.u),
          ),
        )!,
      );
    } else {
      // new, unanswered: cursor is createdAt iso
      conditions.push(
        or(
          lt(questions.createdAt, new Date(cursor.k)),
          and(
            eq(questions.createdAt, new Date(cursor.k)),
            lt(questions.uri, cursor.u),
          ),
        )!,
      );
    }
  }

  const whereExpr = conditions.length ? and(...conditions) : undefined;

  const orderBy = (() => {
    switch (args.sort) {
      case "top":
        return [desc(questions.score), desc(questions.uri)];
      case "most_discussed":
        return [
          desc(sql`${questions.answerCount} + ${questions.commentCount}`),
          desc(questions.uri),
        ];
      case "most_viewed":
      case "trending":
        return [
          desc(sql`coalesce(${analyticsQuestionStats.views7d}, 0)`),
          desc(questions.uri),
        ];
      case "unanswered":
      case "new":
      default:
        return [desc(questions.createdAt), desc(questions.uri)];
    }
  })();

  const rows = await db
    .select({
      uri: questions.uri,
      cid: questions.cid,
      authorDid: questions.authorDid,
      title: questions.title,
      body: questions.body,
      tags: questions.tags,
      score: questions.score,
      answerCount: questions.answerCount,
      commentCount: questions.commentCount,
      createdAt: questions.createdAt,
      acceptedAnswerUri: questions.acceptedAnswerUri,
      profileHandle: profiles.handle,
      profileDisplayName: profiles.displayName,
      profileAvatarUrl: profiles.avatarUrl,
      views7d: analyticsQuestionStats.views7d,
      views24h: analyticsQuestionStats.views24h,
      viewsTotal: analyticsQuestionStats.viewsTotal,
      viewerVoteDirection: viewerVotes.direction,
    })
    .from(questions)
    .leftJoin(profiles, eq(profiles.did, questions.authorDid))
    .leftJoin(
      analyticsQuestionStats,
      eq(analyticsQuestionStats.questionUri, questions.uri),
    )
    .leftJoin(
      viewerVotes,
      args.viewerDid
        ? and(
            eq(viewerVotes.subjectUri, questions.uri),
            eq(viewerVotes.authorDid, args.viewerDid),
          )
        : sql`false`,
    )
    .where(whereExpr)
    .orderBy(...orderBy)
    .limit(args.limit + 1);

  const hasMore = rows.length > args.limit;
  const page = hasMore ? rows.slice(0, args.limit) : rows;

  const items: QuestionCard[] = page.map((r) => ({
    uri: r.uri,
    cid: r.cid,
    author: {
      did: r.authorDid,
      handle: r.profileHandle,
      displayName: r.profileDisplayName,
      avatarUrl: r.profileAvatarUrl,
    },
    title: r.title,
    body: r.body,
    tags: r.tags,
    score: r.score,
    answerCount: r.answerCount,
    commentCount: r.commentCount,
    createdAt: r.createdAt.toISOString(),
    acceptedAnswerUri: r.acceptedAnswerUri,
    views7d: r.views7d ?? 0,
    views24h: r.views24h ?? 0,
    viewsTotal: r.viewsTotal ?? 0,
    viewerVote:
      r.viewerVoteDirection === "up" || r.viewerVoteDirection === "down"
        ? r.viewerVoteDirection
        : null,
  }));

  let nextCursor: string | null = null;
  if (hasMore) {
    const last = page[page.length - 1]!;
    let k: string;
    switch (args.sort) {
      case "top":
        k = String(last.score);
        break;
      case "most_discussed":
        k = String(last.answerCount + last.commentCount);
        break;
      case "most_viewed":
      case "trending":
        k = String(last.views7d ?? 0);
        break;
      default:
        k = last.createdAt.toISOString();
        break;
    }
    nextCursor = encodeCursor({ k, u: last.uri });
  }

  return { items, cursor: nextCursor };
}

export interface QuestionDetail extends QuestionCard {
  answers: AnswerDetail[];
  comments: CommentDetail[];
}

export interface AnswerDetail {
  uri: string;
  cid: string;
  author: ProfileSummary;
  body: string;
  score: number;
  commentCount: number;
  createdAt: string;
  isAccepted: boolean;
  comments: CommentDetail[];
  viewerVote: "up" | "down" | null;
}

export interface CommentDetail {
  uri: string;
  cid: string;
  author: ProfileSummary;
  subjectUri: string;
  parentUri: string | null;
  body: string;
  createdAt: string;
}

export async function getQuestionDetail(
  uri: string,
  viewerDid?: string,
): Promise<QuestionDetail | null> {
  const viewerQuestionVotes = aliasedTable(votes, "viewer_q_votes");
  const viewerAnswerVotes = aliasedTable(votes, "viewer_a_votes");
  const q = await db
    .select({
      uri: questions.uri,
      cid: questions.cid,
      authorDid: questions.authorDid,
      title: questions.title,
      body: questions.body,
      tags: questions.tags,
      score: questions.score,
      answerCount: questions.answerCount,
      commentCount: questions.commentCount,
      createdAt: questions.createdAt,
      acceptedAnswerUri: questions.acceptedAnswerUri,
      profileHandle: profiles.handle,
      profileDisplayName: profiles.displayName,
      profileAvatarUrl: profiles.avatarUrl,
      views7d: analyticsQuestionStats.views7d,
      views24h: analyticsQuestionStats.views24h,
      viewsTotal: analyticsQuestionStats.viewsTotal,
      viewerVoteDirection: viewerQuestionVotes.direction,
    })
    .from(questions)
    .leftJoin(profiles, eq(profiles.did, questions.authorDid))
    .leftJoin(
      analyticsQuestionStats,
      eq(analyticsQuestionStats.questionUri, questions.uri),
    )
    .leftJoin(
      viewerQuestionVotes,
      viewerDid
        ? and(
            eq(viewerQuestionVotes.subjectUri, questions.uri),
            eq(viewerQuestionVotes.authorDid, viewerDid),
          )
        : sql`false`,
    )
    .where(eq(questions.uri, uri))
    .limit(1);

  const row = q[0];
  if (!row) return null;

  const answerRows = await db
    .select({
      uri: answers.uri,
      cid: answers.cid,
      authorDid: answers.authorDid,
      body: answers.body,
      score: answers.score,
      commentCount: answers.commentCount,
      createdAt: answers.createdAt,
      profileHandle: profiles.handle,
      profileDisplayName: profiles.displayName,
      profileAvatarUrl: profiles.avatarUrl,
      viewerVoteDirection: viewerAnswerVotes.direction,
    })
    .from(answers)
    .leftJoin(profiles, eq(profiles.did, answers.authorDid))
    .leftJoin(
      viewerAnswerVotes,
      viewerDid
        ? and(
            eq(viewerAnswerVotes.subjectUri, answers.uri),
            eq(viewerAnswerVotes.authorDid, viewerDid),
          )
        : sql`false`,
    )
    .where(eq(answers.questionUri, uri))
    .orderBy(desc(answers.score), answers.createdAt);

  const subjectUris = [uri, ...answerRows.map((a) => a.uri)];
  const commentRows = subjectUris.length
    ? await db
        .select({
          uri: comments.uri,
          cid: comments.cid,
          authorDid: comments.authorDid,
          subjectUri: comments.subjectUri,
          parentUri: comments.parentUri,
          body: comments.body,
          createdAt: comments.createdAt,
          profileHandle: profiles.handle,
          profileDisplayName: profiles.displayName,
          profileAvatarUrl: profiles.avatarUrl,
        })
        .from(comments)
        .leftJoin(profiles, eq(profiles.did, comments.authorDid))
        .where(inArray(comments.subjectUri, subjectUris))
        .orderBy(comments.createdAt)
    : [];

  const toComment = (c: (typeof commentRows)[number]): CommentDetail => ({
    uri: c.uri,
    cid: c.cid,
    author: {
      did: c.authorDid,
      handle: c.profileHandle,
      displayName: c.profileDisplayName,
      avatarUrl: c.profileAvatarUrl,
    },
    subjectUri: c.subjectUri,
    parentUri: c.parentUri,
    body: c.body,
    createdAt: c.createdAt.toISOString(),
  });

  const questionComments = commentRows
    .filter((c) => c.subjectUri === uri)
    .map(toComment);

  const accepted = row.acceptedAnswerUri;
  const answerDetails: AnswerDetail[] = answerRows
    .map((a) => {
      const detail: AnswerDetail = {
        uri: a.uri,
        cid: a.cid,
        author: {
          did: a.authorDid,
          handle: a.profileHandle,
          displayName: a.profileDisplayName,
          avatarUrl: a.profileAvatarUrl,
        },
        body: a.body,
        score: a.score,
        commentCount: a.commentCount,
        createdAt: a.createdAt.toISOString(),
        isAccepted: accepted === a.uri,
        comments: commentRows
          .filter((c) => c.subjectUri === a.uri)
          .map(toComment),
        viewerVote:
          a.viewerVoteDirection === "up" || a.viewerVoteDirection === "down"
            ? a.viewerVoteDirection
            : null,
      };
      return detail;
    })
    .sort((a, b) => {
      if (a.isAccepted && !b.isAccepted) return -1;
      if (!a.isAccepted && b.isAccepted) return 1;
      if (b.score !== a.score) return b.score - a.score;
      return a.createdAt.localeCompare(b.createdAt);
    });

  return {
    uri: row.uri,
    cid: row.cid,
    author: {
      did: row.authorDid,
      handle: row.profileHandle,
      displayName: row.profileDisplayName,
      avatarUrl: row.profileAvatarUrl,
    },
    title: row.title,
    body: row.body,
    tags: row.tags,
    score: row.score,
    answerCount: row.answerCount,
    commentCount: row.commentCount,
    createdAt: row.createdAt.toISOString(),
    acceptedAnswerUri: row.acceptedAnswerUri,
    views7d: row.views7d ?? 0,
    views24h: row.views24h ?? 0,
    viewsTotal: row.viewsTotal ?? 0,
    viewerVote:
      row.viewerVoteDirection === "up" || row.viewerVoteDirection === "down"
        ? row.viewerVoteDirection
        : null,
    answers: answerDetails,
    comments: questionComments,
  };
}
