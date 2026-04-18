import { createFileRoute } from "@tanstack/react-router";
import { oauthClient } from "@asq/server/oauth/client";
import { json } from "../lib/server/responses";

export const Route = createFileRoute("/jwks.json")({
  server: {
    handlers: {
      GET: async () => {
        const client = await oauthClient();
        return json(client.jwks);
      },
    },
  },
});
