import { createFileRoute } from "@tanstack/react-router";
import { searchQuestions } from "@asq/server/db/queries/search";
import { getAsqSession } from "../../lib/server/session";
import { json } from "../../lib/server/responses";

export const Route = createFileRoute("/api/search")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const q = url.searchParams.get("q") ?? "";
        const cursor = url.searchParams.get("cursor") ?? undefined;
        const rawLimit = Number(url.searchParams.get("limit") ?? 20);
        const limit = Math.min(
          Math.max(Number.isFinite(rawLimit) ? rawLimit : 20, 1),
          50,
        );
        const asq = await getAsqSession();
        const result = await searchQuestions({
          q,
          cursor,
          limit,
          viewerDid: asq?.did,
        });
        return json(result);
      },
    },
  },
});
