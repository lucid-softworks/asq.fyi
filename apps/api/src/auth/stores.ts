import { and, eq, lt } from "drizzle-orm";
import type {
  NodeSavedSession,
  NodeSavedSessionStore,
  NodeSavedState,
  NodeSavedStateStore,
} from "@atproto/oauth-client-node";
import { db } from "../db/client";
import { oauthAuthState, oauthSessions } from "../db/schema";

const STATE_TTL_SEC = 60 * 10; // authorization requests typically complete in minutes
const SESSION_TTL_SEC = 60 * 60 * 24 * 60; // 60 days

function stateExpiry(): Date {
  return new Date(Date.now() + STATE_TTL_SEC * 1000);
}
function sessionExpiry(): Date {
  return new Date(Date.now() + SESSION_TTL_SEC * 1000);
}

export const stateStore: NodeSavedStateStore = {
  async get(key) {
    const rows = await db
      .select()
      .from(oauthAuthState)
      .where(eq(oauthAuthState.key, key))
      .limit(1);
    const row = rows[0];
    if (!row) return undefined;
    if (row.expiresAt && row.expiresAt.getTime() < Date.now()) {
      await db.delete(oauthAuthState).where(eq(oauthAuthState.key, key));
      return undefined;
    }
    return row.value as NodeSavedState;
  },
  async set(key, value) {
    await db
      .insert(oauthAuthState)
      .values({ key, value, expiresAt: stateExpiry() })
      .onConflictDoUpdate({
        target: oauthAuthState.key,
        set: { value, expiresAt: stateExpiry() },
      });
  },
  async del(key) {
    await db.delete(oauthAuthState).where(eq(oauthAuthState.key, key));
  },
};

export const sessionStore: NodeSavedSessionStore = {
  async get(key) {
    const rows = await db
      .select()
      .from(oauthSessions)
      .where(eq(oauthSessions.key, key))
      .limit(1);
    const row = rows[0];
    if (!row) return undefined;
    return row.value as NodeSavedSession;
  },
  async set(key, value) {
    await db
      .insert(oauthSessions)
      .values({ key, value, expiresAt: sessionExpiry() })
      .onConflictDoUpdate({
        target: oauthSessions.key,
        set: { value, expiresAt: sessionExpiry() },
      });
  },
  async del(key) {
    await db.delete(oauthSessions).where(eq(oauthSessions.key, key));
  },
};

export async function pruneExpiredAuthState(): Promise<number> {
  const rows = await db
    .delete(oauthAuthState)
    .where(
      and(
        lt(oauthAuthState.expiresAt, new Date()),
        // guard: only rows with a non-null expiry
        eq(oauthAuthState.expiresAt, oauthAuthState.expiresAt),
      ),
    )
    .returning({ key: oauthAuthState.key });
  return rows.length;
}
