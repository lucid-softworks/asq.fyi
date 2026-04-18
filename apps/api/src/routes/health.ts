import { Elysia } from "elysia";
import { eq } from "drizzle-orm";
import { db } from "../db/client";
import { jetstreamCursor } from "../db/schema";

export const healthRoutes = new Elysia().get("/health", async () => {
  let jetstreamLagSeconds: number | null = null;
  try {
    const rows = await db
      .select({
        cursor: jetstreamCursor.cursor,
      })
      .from(jetstreamCursor)
      .where(eq(jetstreamCursor.id, 1))
      .limit(1);
    const c = rows[0]?.cursor;
    if (typeof c === "number" && c > 0) {
      const nowMicros = Date.now() * 1_000;
      jetstreamLagSeconds = Math.max(0, Math.round((nowMicros - c) / 1_000_000));
    }
  } catch {
    // ignore; health should not fail just because we can't read cursor
  }
  return { ok: true, jetstreamLagSeconds };
});
