import { createFileRoute } from "@tanstack/react-router";
import { oauthClient } from "@asq/server/oauth/client";
import { useAsqSession, clearAsqSession } from "../../lib/server/session";
import { noContent } from "../../lib/server/responses";

export const Route = createFileRoute("/auth/logout")({
  server: {
    handlers: {
      POST: async () => {
        const session = await useAsqSession();
        const did = session.data.did;
        if (did) {
          try {
            const client = await oauthClient();
            await client.revoke(did);
          } catch (err) {
            console.warn(`oauth revoke failed for ${did}:`, err);
          }
        }
        await clearAsqSession();
        return noContent();
      },
    },
  },
});
