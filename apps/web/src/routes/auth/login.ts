import { createFileRoute } from "@tanstack/react-router";
import { oauthClient } from "@asq/server/oauth/client";
import { error } from "../../lib/server/responses";

export const Route = createFileRoute("/auth/login")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const handle = url.searchParams.get("handle")?.trim();
        if (!handle) {
          return error(400, {
            error: "validation_failed",
            message: "Missing ?handle parameter",
          });
        }
        try {
          const client = await oauthClient();
          const target = await client.authorize(handle, {
            scope: "atproto transition:generic",
          });
          return new Response(null, {
            status: 302,
            headers: { location: target.toString() },
          });
        } catch (err) {
          const message =
            err instanceof Error ? err.message : "Failed to start login";
          return error(400, { error: "login_failed", message });
        }
      },
    },
  },
});
