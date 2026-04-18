import { createFileRoute } from "@tanstack/react-router";
import { createCommentSchema } from "@asq/shared";
import { createRecord, PdsWriteError } from "@asq/server/atproto/write";
import {
  RateLimitExceededError,
  consumeRateLimit,
} from "@asq/server/lib/rate-limit";
import { getAsqSession } from "../../lib/server/session";
import {
  error,
  json,
  unauthorized,
  validationFailed,
} from "../../lib/server/responses";

export const Route = createFileRoute("/api/comments")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const asq = await getAsqSession();
        if (!asq) return unauthorized();

        const body = (await request.json()) as unknown;
        const parsed = createCommentSchema.safeParse(body);
        if (!parsed.success) return validationFailed(parsed.error);

        const {
          subjectUri,
          subjectCid,
          parentUri,
          parentCid,
          body: content,
        } = parsed.data;
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
          await consumeRateLimit(asq.did, "comments");
          const result = await createRecord(
            asq.session,
            "fyi.asq.comment",
            record,
          );
          return json({ ...result, authorDid: asq.did });
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
