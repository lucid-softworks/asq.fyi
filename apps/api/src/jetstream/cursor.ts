import { eq } from "drizzle-orm";
import { db } from "../db/client";
import { jetstreamCursor } from "../db/schema";

const SINGLETON_ID = 1;

export async function loadCursor(): Promise<number> {
  const rows = await db
    .select({ cursor: jetstreamCursor.cursor })
    .from(jetstreamCursor)
    .where(eq(jetstreamCursor.id, SINGLETON_ID))
    .limit(1);
  return rows[0]?.cursor ?? 0;
}

export async function saveCursor(cursor: number): Promise<void> {
  await db
    .insert(jetstreamCursor)
    .values({ id: SINGLETON_ID, cursor, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: jetstreamCursor.id,
      set: { cursor, updatedAt: new Date() },
    });
}
