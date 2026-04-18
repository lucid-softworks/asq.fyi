import { createFileRoute } from "@tanstack/react-router";
import { eq } from "drizzle-orm";
import { db } from "@asq/server/db";
import { jetstreamCursor } from "@asq/server/db/schema";
import { json } from "../lib/server/responses";

export const Route = createFileRoute("/health")({
  server: {
    handlers: {
      GET: async () => {
        let jetstreamLagSeconds: number | null = null;
        try {
          const rows = await db
            .select({ cursor: jetstreamCursor.cursor })
            .from(jetstreamCursor)
            .where(eq(jetstreamCursor.id, 1))
            .limit(1);
          const c = rows[0]?.cursor;
          if (typeof c === "number" && c > 0) {
            const nowMicros = Date.now() * 1_000;
            jetstreamLagSeconds = Math.max(
              0,
              Math.round((nowMicros - c) / 1_000_000),
            );
          }
        } catch {
          // health should not fail just because we can't read cursor
        }
        return json({ ok: true, jetstreamLagSeconds });
      },
    },
  },
});
