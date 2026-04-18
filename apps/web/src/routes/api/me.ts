import { createFileRoute } from "@tanstack/react-router";
import { oauthClient } from "@asq/server/oauth/client";
import { hydrateProfile } from "@asq/server/atproto/profile";
import { useAsqSession, clearAsqSession } from "../../lib/server/session";
import { json, unauthorized } from "../../lib/server/responses";

export const Route = createFileRoute("/api/me")({
  server: {
    handlers: {
      GET: async () => {
        const session = await useAsqSession();
        const did = session.data.did;
        if (!did) return unauthorized();
        try {
          const client = await oauthClient();
          const oauth = await client.restore(did);
          const profile = await hydrateProfile(oauth);
          return json(profile);
        } catch (err) {
          console.warn(`session restore failed for ${did}:`, err);
          await clearAsqSession();
          return unauthorized();
        }
      },
    },
  },
});
