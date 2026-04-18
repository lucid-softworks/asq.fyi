import { createFileRoute } from "@tanstack/react-router";
import { eq } from "drizzle-orm";
import { createAnswerSchema } from "@asq/shared";
import { db } from "@asq/server/db";
import { questions } from "@asq/server/db/schema";
import {
  PdsWriteError,
  createRecord,
  type StrongRef,
} from "@asq/server/atproto/write";
import {
  RateLimitExceededError,
  consumeRateLimit,
} from "@asq/server/lib/rate-limit";
import { getAsqSession } from "../../../../lib/server/session";
import {
  error,
  json,
  notFound,
  unauthorized,
  validationFailed,
} from "../../../../lib/server/responses";

export const Route = createFileRoute("/api/questions/$uri/answers")({
  server: {
    handlers: {
      POST: async ({ request, params }) => {
        const asq = await getAsqSession();
        if (!asq) return unauthorized();

        const body = (await request.json()) as unknown;
        const parsed = createAnswerSchema.safeParse(body);
        if (!parsed.success) return validationFailed(parsed.error);

        const questionUri = decodeURIComponent(params.uri);
        const q = await db
          .select({ uri: questions.uri, cid: questions.cid })
          .from(questions)
          .where(eq(questions.uri, questionUri))
          .limit(1);
        const target = q[0];
        if (!target) return notFound("Question not found");

        const createdAt = new Date().toISOString();
        const subject: StrongRef = { uri: target.uri, cid: target.cid };

        try {
          await consumeRateLimit(asq.did, "answers");
          const result = await createRecord(asq.session, "fyi.asq.answer", {
            subject,
            body: parsed.data.body,
            createdAt,
          });
          return json({
            ...result,
            questionUri: target.uri,
            authorDid: asq.did,
          });
        } catch (err) {
          if (err instanceof RateLimitExceededError) {
            const retryAfter = Math.ceil(
              (err.status.resetAt.getTime() - Date.now()) / 1000,
            );
            return error(
              429,
              {
                error: "rate_limited",
                message: `You've hit the daily limit for ${err.action}. Resets at ${err.status.resetAt.toISOString()}.`,
                retryAfter,
              },
              { "retry-after": String(retryAfter) },
            );
          }
          if (err instanceof PdsWriteError) {
            return error(502, { error: "pds_error", message: err.message });
          }
          throw err;
        }
      },
    },
  },
});
