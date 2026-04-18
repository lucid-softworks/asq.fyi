import { useSession } from "@tanstack/react-start/server";
import type { OAuthSession } from "@atproto/oauth-client-node";
import { env } from "@asq/server/env";
import { oauthClient } from "@asq/server/oauth/client";

export const SESSION_COOKIE = "asq_sid";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 days

export interface AsqSessionData {
  did?: string;
}

export function useAsqSession() {
  return useSession<AsqSessionData>({
    name: SESSION_COOKIE,
    password: env.COOKIE_SECRET,
    cookie: {
      secure: env.NODE_ENV === "production",
      sameSite: "lax",
      httpOnly: true,
      path: "/",
      maxAge: MAX_AGE_SECONDS,
    },
  });
}

export interface SessionContext {
  did: string;
  session: OAuthSession;
}

/**
 * Reads the signed session cookie and restores the ATProto OAuth session.
 * Returns `null` if there's no cookie or if the OAuth session can't be
 * restored (expired refresh token, revoked, etc.). In that case callers
 * should treat the request as unauthenticated; the stale cookie will be
 * overwritten on the next login.
 */
export async function getAsqSession(): Promise<SessionContext | null> {
  const session = await useAsqSession();
  const did = session.data.did;
  if (!did) return null;
  try {
    const client = await oauthClient();
    const oauth = await client.restore(did);
    return { did, session: oauth };
  } catch {
    await session.clear();
    return null;
  }
}

export async function setAsqSessionDid(did: string): Promise<void> {
  const session = await useAsqSession();
  await session.update({ did });
}

export async function clearAsqSession(): Promise<void> {
  const session = await useAsqSession();
  await session.clear();
}
