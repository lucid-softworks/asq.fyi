import { createFileRoute } from "@tanstack/react-router";
import {
  createQuestionSchema,
} from "@asq/shared";
import {
  listQuestions,
  type QuestionSort,
} from "@asq/server/db/queries/questions";
import { createRecord, PdsWriteError } from "@asq/server/atproto/write";
import {
  RateLimitExceededError,
  consumeRateLimit,
} from "@asq/server/lib/rate-limit";
import { getAsqSession } from "../../../lib/server/session";
import {
  error,
  json,
  unauthorized,
  validationFailed,
} from "../../../lib/server/responses";

const sortValues: QuestionSort[] = [
  "new",
  "top",
  "unanswered",
  "trending",
  "most_viewed",
  "most_discussed",
];

export const Route = createFileRoute("/api/questions/")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const sort = (sortValues as string[]).includes(
          url.searchParams.get("sort") ?? "",
        )
          ? (url.searchParams.get("sort") as QuestionSort)
          : "new";
        const rawLimit = Number(url.searchParams.get("limit") ?? 20);
        const limit = Math.min(
          Math.max(Number.isFinite(rawLimit) ? rawLimit : 20, 1),
          50,
        );
        const tag = url.searchParams.get("tag") ?? undefined;
        const cursor = url.searchParams.get("cursor") ?? undefined;

        const asq = await getAsqSession();
        const result = await listQuestions({
          sort,
          tag,
          cursor,
          limit,
          viewerDid: asq?.did,
        });
        return json(result);
      },

      POST: async ({ request }) => {
        const asq = await getAsqSession();
        if (!asq) return unauthorized();

        const body = (await request.json()) as unknown;
        const parsed = createQuestionSchema.safeParse(body);
        if (!parsed.success) return validationFailed(parsed.error);

        const { title, body: content, tags } = parsed.data;
        const createdAt = new Date().toISOString();

        try {
          await consumeRateLimit(asq.did, "questions");
          const result = await createRecord(
            asq.session,
            "fyi.asq.question",
            { title, body: content, tags, createdAt },
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
