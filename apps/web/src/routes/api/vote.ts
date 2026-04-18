import { createFileRoute } from "@tanstack/react-router";
import { and, eq } from "drizzle-orm";
import { voteSchema } from "@asq/shared";
import { db } from "@asq/server/db";
import { votes } from "@asq/server/db/schema";
import {
  PdsWriteError,
  createRecord,
  deleteRecord,
} from "@asq/server/atproto/write";
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

export const Route = createFileRoute("/api/vote")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const asq = await getAsqSession();
        if (!asq) return unauthorized();

        const body = (await request.json()) as unknown;
        const parsed = voteSchema.safeParse(body);
        if (!parsed.success) return validationFailed(parsed.error);

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
                eq(votes.authorDid, asq.did),
                eq(votes.subjectUri, subjectUri),
              ),
            )
            .limit(1);

          const prev = existing[0];

          if (prev) {
            try {
              await deleteRecord(asq.session, prev.uri);
            } catch (err) {
              if (err instanceof PdsWriteError) {
                return error(502, {
                  error: "pds_error",
                  message: err.message,
                });
              }
              throw err;
            }
            if (prev.direction === direction) {
              return json({ toggledOff: true, direction: null });
            }
          }

          const createdAt = new Date().toISOString();
          await consumeRateLimit(asq.did, "votes");
          const result = await createRecord(asq.session, "fyi.asq.vote", {
            subject: { uri: subjectUri, cid: subjectCid },
            direction,
            createdAt,
          });
          return json({ toggledOff: false, direction, ...result });
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
