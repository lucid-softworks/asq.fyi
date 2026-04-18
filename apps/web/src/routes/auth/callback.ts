import { createFileRoute } from "@tanstack/react-router";
import { oauthClient } from "@asq/server/oauth/client";
import { hydrateProfile } from "@asq/server/atproto/profile";
import { setAsqSessionDid } from "../../lib/server/session";

export const Route = createFileRoute("/auth/callback")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        try {
          const client = await oauthClient();
          const { session } = await client.callback(url.searchParams);
          await hydrateProfile(session);
          await setAsqSessionDid(session.did);
          return new Response(null, {
            status: 302,
            headers: { location: "/" },
          });
        } catch (err) {
          console.error("oauth callback error:", err);
          const message =
            err instanceof Error ? err.message : "OAuth callback failed";
          const target = new URL("/login", url);
          target.searchParams.set("error", message);
          return new Response(null, {
            status: 302,
            headers: { location: target.pathname + target.search },
          });
        }
      },
    },
  },
});
