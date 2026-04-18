import { Elysia } from "elysia";
import { oauthClient } from "../auth/client";
import {
  clearSessionCookie,
  readSessionDid,
} from "../auth/session";
import { hydrateProfile } from "../atproto/profile";

export const meRoutes = new Elysia({ prefix: "/api" }).get(
  "/me",
  async ({ cookie, set }) => {
    const did = readSessionDid(cookie);
    if (!did) {
      set.status = 401;
      return { error: "unauthorized", message: "Not logged in" };
    }
    try {
      const session = await oauthClient.restore(did);
      const profile = await hydrateProfile(session);
      return profile;
    } catch (err) {
      console.warn(`session restore failed for ${did}:`, err);
      clearSessionCookie(cookie);
      set.status = 401;
      return {
        error: "unauthorized",
        message: "Session expired, please log in again",
      };
    }
  },
);
