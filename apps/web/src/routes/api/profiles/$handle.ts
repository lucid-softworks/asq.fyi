import { createFileRoute } from "@tanstack/react-router";
import { getProfileByHandle } from "@asq/server/db/queries/profiles";
import { json, notFound } from "../../../lib/server/responses";

export const Route = createFileRoute("/api/profiles/$handle")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const view = await getProfileByHandle(params.handle);
        if (!view) return notFound("Profile not found");
        return json(view);
      },
    },
  },
});
