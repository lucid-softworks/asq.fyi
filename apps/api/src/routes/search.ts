import { Elysia, t } from "elysia";
import { searchQuestions } from "../db/queries/search";
import { sessionDerive } from "../auth/middleware";

export const searchRoutes = new Elysia({ prefix: "/api" })
  .use(sessionDerive)
  .get(
    "/search",
    async ({ query, asqSession }) => {
      const limit = Math.min(Math.max(query.limit ?? 20, 1), 50);
      const result = await searchQuestions({
        q: query.q ?? "",
        cursor: query.cursor,
        limit,
        viewerDid: asqSession?.did,
      });
      return result;
    },
    {
      query: t.Object({
        q: t.Optional(t.String()),
        cursor: t.Optional(t.String()),
        limit: t.Optional(t.Numeric()),
      }),
    },
  );
