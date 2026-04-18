import { Elysia, t } from "elysia";
import { listTags, type TagSort } from "../db/queries/tags";

export const tagsRoutes = new Elysia({ prefix: "/api" }).get(
  "/tags",
  async ({ query }) => {
    const sort: TagSort = query.sort === "trending" ? "trending" : "popular";
    const limit = Math.min(Math.max(query.limit ?? 50, 1), 100);
    const items = await listTags({ sort, limit });
    return { items };
  },
  {
    query: t.Object({
      sort: t.Optional(t.String()),
      limit: t.Optional(t.Numeric()),
    }),
  },
);
