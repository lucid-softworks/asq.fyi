import { createFileRoute } from "@tanstack/react-router";
import { listTags, type TagSort } from "@asq/server/db/queries/tags";
import { json } from "../../lib/server/responses";

export const Route = createFileRoute("/api/tags")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const sort: TagSort =
          url.searchParams.get("sort") === "trending" ? "trending" : "popular";
        const rawLimit = Number(url.searchParams.get("limit") ?? 50);
        const limit = Math.min(
          Math.max(Number.isFinite(rawLimit) ? rawLimit : 50, 1),
          100,
        );
        const items = await listTags({ sort, limit });
        return json({ items });
      },
    },
  },
});
