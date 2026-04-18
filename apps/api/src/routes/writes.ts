import { Elysia } from "elysia";
import { and, eq } from "drizzle-orm";
import {
  acceptAnswerSchema,
  createAnswerSchema,
  createCommentSchema,
  createQuestionSchema,
  voteSchema,
} from "@asq/shared";
import { db } from "../db/client";
import {
  acceptedAnswers,
  answers,
  questions,
  votes,
} from "../db/schema";
import { sessionDerive } from "../auth/middleware";
import {
  PdsWriteError,
  createRecord,
  deleteRecord,
  type CreateRecordResult,
  type StrongRef,
} from "../atproto/write";
import { parseAtUri } from "../atproto/uri";
import {
  RateLimitExceededError,
  consumeRateLimit,
  type RateLimitAction,
} from "../lib/rate-limit";

// Elysia's `set` is loosely typed across versions; keep these helpers wide.
type SetBag = {
  status?: unknown;
  headers: Record<string, string | number>;
};

function unauthorized(set: SetBag) {
  set.status = 401;
  return { error: "unauthorized", message: "Not logged in" } as const;
}

function validationFailed(set: SetBag, err: unknown) {
  set.status = 400;
  const details =
    err && typeof err === "object" && "issues" in err
      ? (err as { issues: unknown }).issues
      : undefined;
  return {
    error: "validation_failed",
    message: err instanceof Error ? err.message : "Invalid input",
    details,
  };
}

function rateLimited(set: SetBag, err: RateLimitExceededError) {
  set.status = 429;
  const retryAfter = Math.ceil(
    (err.status.resetAt.getTime() - Date.now()) / 1000,
  );
  set.headers["retry-after"] = String(retryAfter);
  return {
    error: "rate_limited",
    message: `You've hit the daily limit for ${err.action}. Resets at ${err.status.resetAt.toISOString()}.`,
    retryAfter,
  };
}

function pdsFailed(set: SetBag, err: PdsWriteError) {
  set.status = 502;
  return { error: "pds_error", message: err.message };
}

async function withRate<T>(
  did: string,
  action: RateLimitAction,
  fn: () => Promise<T>,
): Promise<T> {
  await consumeRateLimit(did, action);
  return fn();
}

export const writesRoutes = new Elysia({ prefix: "/api" })
  .use(sessionDerive)

  // POST /api/questions
  .post("/questions", async ({ asqSession, body, set }) => {
    if (!asqSession) return unauthorized(set);
    const parsed = createQuestionSchema.safeParse(body);
    if (!parsed.success) return validationFailed(set, parsed.error);
    const { title, body: content, tags } = parsed.data;
    const createdAt = new Date().toISOString();

    try {
      const result = await withRate(asqSession.did, "questions", () =>
        createRecord(asqSession.session, "fyi.asq.question", {
          title,
          body: content,
          tags,
          createdAt,
        }),
      );
      return { ...result, authorDid: asqSession.did };
    } catch (err) {
      if (err instanceof RateLimitExceededError) return rateLimited(set, err);
      if (err instanceof PdsWriteError) return pdsFailed(set, err);
      throw err;
    }
  })

  // POST /api/questions/:uri/answers
  .post("/questions/:uri/answers", async ({ asqSession, params, body, set }) => {
    if (!asqSession) return unauthorized(set);
    const parsed = createAnswerSchema.safeParse(body);
    if (!parsed.success) return validationFailed(set, parsed.error);
    const questionUri = decodeURIComponent(params.uri);
    const q = await db
      .select({ uri: questions.uri, cid: questions.cid })
      .from(questions)
      .where(eq(questions.uri, questionUri))
      .limit(1);
    const target = q[0];
    if (!target) {
      set.status = 404;
      return { error: "not_found", message: "Question not found" };
    }
    const createdAt = new Date().toISOString();
    const subject: StrongRef = { uri: target.uri, cid: target.cid };
    try {
      const result = await withRate(asqSession.did, "answers", () =>
        createRecord(asqSession.session, "fyi.asq.answer", {
          subject,
          body: parsed.data.body,
          createdAt,
        }),
      );
      return { ...result, questionUri: target.uri, authorDid: asqSession.did };
    } catch (err) {
      if (err instanceof RateLimitExceededError) return rateLimited(set, err);
      if (err instanceof PdsWriteError) return pdsFailed(set, err);
      throw err;
    }
  })

  // POST /api/comments
  .post("/comments", async ({ asqSession, body, set }) => {
    if (!asqSession) return unauthorized(set);
    const parsed = createCommentSchema.safeParse(body);
    if (!parsed.success) return validationFailed(set, parsed.error);
    const { subjectUri, subjectCid, parentUri, parentCid, body: content } =
      parsed.data;
    const createdAt = new Date().toISOString();
    const record: Record<string, unknown> = {
      subject: { uri: subjectUri, cid: subjectCid },
      body: content,
      createdAt,
    };
    if (parentUri && parentCid) {
      record.parent = { uri: parentUri, cid: parentCid };
    }
    try {
      const result = await withRate(asqSession.did, "comments", () =>
        createRecord(asqSession.session, "fyi.asq.comment", record),
      );
      return { ...result, authorDid: asqSession.did };
    } catch (err) {
      if (err instanceof RateLimitExceededError) return rateLimited(set, err);
      if (err instanceof PdsWriteError) return pdsFailed(set, err);
      throw err;
    }
  })

  // POST /api/vote — toggle semantics
  .post("/vote", async ({ asqSession, body, set }) => {
    if (!asqSession) return unauthorized(set);
    const parsed = voteSchema.safeParse(body);
    if (!parsed.success) return validationFailed(set, parsed.error);
    const { subjectUri, subjectCid, direction } = parsed.data;

    try {
      const existing = await db
        .select({
          uri: votes.uri,
          direction: votes.direction,
        })
        .from(votes)
        .where(
          and(
            eq(votes.authorDid, asqSession.did),
            eq(votes.subjectUri, subjectUri),
          ),
        )
        .limit(1);

      const prev = existing[0];

      if (prev) {
        try {
          await deleteRecord(asqSession.session, prev.uri);
        } catch (err) {
          if (err instanceof PdsWriteError) return pdsFailed(set, err);
          throw err;
        }
        if (prev.direction === direction) {
          return { toggledOff: true, direction: null } as const;
        }
      }

      const createdAt = new Date().toISOString();
      const result = await withRate(asqSession.did, "votes", () =>
        createRecord(asqSession.session, "fyi.asq.vote", {
          subject: { uri: subjectUri, cid: subjectCid },
          direction,
          createdAt,
        }),
      );
      return {
        toggledOff: false,
        direction,
        ...result,
      } as const;
    } catch (err) {
      if (err instanceof RateLimitExceededError) return rateLimited(set, err);
      if (err instanceof PdsWriteError) return pdsFailed(set, err);
      throw err;
    }
  })

  // POST /api/questions/:uri/accept
  .post("/questions/:uri/accept", async ({ asqSession, params, body, set }) => {
    if (!asqSession) return unauthorized(set);
    const parsed = acceptAnswerSchema.safeParse(body);
    if (!parsed.success) return validationFailed(set, parsed.error);
    const questionUri = decodeURIComponent(params.uri);

    const q = await db
      .select({
        uri: questions.uri,
        cid: questions.cid,
        authorDid: questions.authorDid,
      })
      .from(questions)
      .where(eq(questions.uri, questionUri))
      .limit(1);
    const target = q[0];
    if (!target) {
      set.status = 404;
      return { error: "not_found", message: "Question not found" };
    }
    if (target.authorDid !== asqSession.did) {
      set.status = 403;
      return {
        error: "forbidden",
        message: "Only the question's author can accept an answer",
      };
    }

    const a = await db
      .select({ uri: answers.uri, cid: answers.cid })
      .from(answers)
      .where(eq(answers.uri, parsed.data.answerUri))
      .limit(1);
    const answerRow = a[0];
    if (!answerRow) {
      set.status = 404;
      return { error: "not_found", message: "Answer not found" };
    }

    try {
      const existing = await db
        .select({ uri: acceptedAnswers.uri })
        .from(acceptedAnswers)
        .where(eq(acceptedAnswers.questionUri, questionUri))
        .limit(1);
      if (existing[0]) {
        try {
          await deleteRecord(asqSession.session, existing[0].uri);
        } catch (err) {
          if (err instanceof PdsWriteError) return pdsFailed(set, err);
          throw err;
        }
      }
      const createdAt = new Date().toISOString();
      const result: CreateRecordResult = await createRecord(
        asqSession.session,
        "fyi.asq.acceptedAnswer",
        {
          question: { uri: target.uri, cid: target.cid },
          answer: { uri: answerRow.uri, cid: answerRow.cid },
          createdAt,
        },
      );
      return result;
    } catch (err) {
      if (err instanceof PdsWriteError) return pdsFailed(set, err);
      throw err;
    }
  })

  // DELETE /api/records/:uri
  .delete("/records/:uri", async ({ asqSession, params, set }) => {
    if (!asqSession) return unauthorized(set);
    const uri = decodeURIComponent(params.uri);
    const parsed = parseAtUri(uri);
    if (!parsed) {
      set.status = 400;
      return { error: "validation_failed", message: "Invalid AT URI" };
    }
    if (parsed.did !== asqSession.did) {
      set.status = 403;
      return {
        error: "forbidden",
        message: "You can only delete your own records",
      };
    }
    try {
      await deleteRecord(asqSession.session, uri);
      set.status = 204;
      return;
    } catch (err) {
      if (err instanceof PdsWriteError) return pdsFailed(set, err);
      throw err;
    }
  });
