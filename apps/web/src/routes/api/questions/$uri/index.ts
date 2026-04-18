import { createFileRoute } from "@tanstack/react-router";
import { getQuestionDetail } from "@asq/server/db/queries/questions";
import { getAsqSession } from "../../../../lib/server/session";
import { json, notFound } from "../../../../lib/server/responses";

export const Route = createFileRoute("/api/questions/$uri/")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const uri = decodeURIComponent(params.uri);
        const asq = await getAsqSession();
        const detail = await getQuestionDetail(uri, asq?.did);
        if (!detail) return notFound("Question not found");
        return json(detail);
      },
    },
  },
});
