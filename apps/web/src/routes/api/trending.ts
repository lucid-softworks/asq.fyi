import { createFileRoute } from "@tanstack/react-router";
import { listTrending } from "@asq/server/analytics/trending";
import { json } from "../../lib/server/responses";

export const Route = createFileRoute("/api/trending")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const window =
          url.searchParams.get("window") === "24h" ? "24h" : "7d";
        const rawLimit = Number(url.searchParams.get("limit") ?? 20);
        const limit = Math.min(
          Math.max(Number.isFinite(rawLimit) ? rawLimit : 20, 1),
          50,
        );
        const items = await listTrending({ window, limit });
        return json({ items, cursor: null });
      },
    },
  },
});
