import { Elysia, t } from "elysia";
import { oauthClient } from "../auth/client";
import {
  clearSessionCookie,
  readSessionDid,
  writeSessionCookie,
} from "../auth/session";
import { hydrateProfile } from "../atproto/profile";
import { env } from "../env";

export const authRoutes = new Elysia()
  .get("/client-metadata.json", ({ set }) => {
    set.headers["content-type"] = "application/json";
    return oauthClient.clientMetadata;
  })
  .get("/jwks.json", ({ set }) => {
    set.headers["content-type"] = "application/json";
    return oauthClient.jwks;
  })
  .get(
    "/auth/login",
    async ({ query, set, redirect }) => {
      const handle = query.handle?.trim();
      if (!handle) {
        set.status = 400;
        return {
          error: "validation_failed",
          message: "Missing ?handle parameter",
        };
      }
      try {
        const url = await oauthClient.authorize(handle, {
          scope: "atproto transition:generic",
        });
        return redirect(url.toString(), 302);
      } catch (err) {
        set.status = 400;
        const message =
          err instanceof Error ? err.message : "Failed to start login";
        return { error: "login_failed", message };
      }
    },
    { query: t.Object({ handle: t.Optional(t.String()) }) },
  )
  .get("/auth/callback", async ({ request, cookie, redirect }) => {
    const url = new URL(request.url);
    try {
      const { session } = await oauthClient.callback(url.searchParams);
      await hydrateProfile(session);
      writeSessionCookie(cookie, session.did);
      return redirect(env.PUBLIC_WEB_URL, 302);
    } catch (err) {
      console.error("oauth callback error:", err);
      const message =
        err instanceof Error ? err.message : "OAuth callback failed";
      const target = new URL(env.PUBLIC_WEB_URL);
      target.pathname = "/login";
      target.searchParams.set("error", message);
      return redirect(target.toString(), 302);
    }
  })
  .post("/auth/logout", async ({ cookie, set }) => {
    const did = readSessionDid(cookie);
    if (did) {
      try {
        await oauthClient.revoke(did);
      } catch (err) {
        console.warn(`oauth revoke failed for ${did}:`, err);
      }
    }
    clearSessionCookie(cookie);
    set.status = 204;
    return;
  });
