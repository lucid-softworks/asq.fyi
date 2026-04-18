import { createFileRoute } from "@tanstack/react-router";
import { parseAtUri } from "@asq/server/atproto/uri";
import { deleteRecord, PdsWriteError } from "@asq/server/atproto/write";
import { getAsqSession } from "../../../lib/server/session";
import {
  error,
  forbidden,
  noContent,
  unauthorized,
} from "../../../lib/server/responses";

export const Route = createFileRoute("/api/records/$uri")({
  server: {
    handlers: {
      DELETE: async ({ params }) => {
        const asq = await getAsqSession();
        if (!asq) return unauthorized();

        const uri = decodeURIComponent(params.uri);
        const parsed = parseAtUri(uri);
        if (!parsed) {
          return error(400, {
            error: "validation_failed",
            message: "Invalid AT URI",
          });
        }
        if (parsed.did !== asq.did) {
          return forbidden("You can only delete your own records");
        }
        try {
          await deleteRecord(asq.session, uri);
          return noContent();
        } catch (err) {
          if (err instanceof PdsWriteError) {
            return error(502, { error: "pds_error", message: err.message });
          }
          throw err;
        }
      },
    },
  },
});
