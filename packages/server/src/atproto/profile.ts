import { Agent } from "@atproto/api";
import { eq } from "drizzle-orm";
import type { OAuthSession } from "@atproto/oauth-client-node";
import { db } from "../db/client";
import { profiles } from "../db/schema";

const REFRESH_AFTER_MS = 1000 * 60 * 60 * 24; // 24h

export interface HydratedProfile {
  did: string;
  handle: string | null;
  displayName: string | null;
  avatarUrl: string | null;
}

export async function hydrateProfile(
  session: OAuthSession,
): Promise<HydratedProfile> {
  const did = session.did;
  const existing = await db
    .select()
    .from(profiles)
    .where(eq(profiles.did, did))
    .limit(1);

  const row = existing[0];
  if (row && Date.now() - row.updatedAt.getTime() < REFRESH_AFTER_MS) {
    return {
      did: row.did,
      handle: row.handle,
      displayName: row.displayName,
      avatarUrl: row.avatarUrl,
    };
  }

  return refreshProfile(session);
}

export async function refreshProfile(
  session: OAuthSession,
): Promise<HydratedProfile> {
  const did = session.did;
  const agent = new Agent(session);
  try {
    const res = await agent.app.bsky.actor.getProfile({ actor: did });
    const hydrated: HydratedProfile = {
      did,
      handle: res.data.handle ?? null,
      displayName: res.data.displayName ?? null,
      avatarUrl: res.data.avatar ?? null,
    };
    await db
      .insert(profiles)
      .values({
        did: hydrated.did,
        handle: hydrated.handle,
        displayName: hydrated.displayName,
        avatarUrl: hydrated.avatarUrl,
      })
      .onConflictDoUpdate({
        target: profiles.did,
        set: {
          handle: hydrated.handle,
          displayName: hydrated.displayName,
          avatarUrl: hydrated.avatarUrl,
          updatedAt: new Date(),
        },
      });
    return hydrated;
  } catch (err) {
    console.warn(`profile hydration failed for ${did}:`, err);
    return { did, handle: null, displayName: null, avatarUrl: null };
  }
}
