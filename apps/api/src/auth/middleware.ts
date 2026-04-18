import { Elysia } from "elysia";
import type { OAuthSession } from "@atproto/oauth-client-node";
import { oauthClient } from "./client";
import { clearSessionCookie, readSessionDid } from "./session";

export interface SessionContext {
  did: string;
  session: OAuthSession;
}

export const sessionDerive = new Elysia({ name: "asq.session" }).derive(
  { as: "scoped" },
  async ({ cookie }): Promise<{ asqSession: SessionContext | null }> => {
    const did = readSessionDid(cookie);
    if (!did) return { asqSession: null };
    try {
      const session = await oauthClient.restore(did);
      return { asqSession: { did, session } };
    } catch {
      clearSessionCookie(cookie);
      return { asqSession: null };
    }
  },
);
