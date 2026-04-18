import type { Cookie } from "elysia";
import { env } from "../env";

export const SESSION_COOKIE = "asq_sid";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 days

type CookieJar = Record<string, Cookie<unknown>>;

export function writeSessionCookie(cookie: CookieJar, did: string): void {
  const c = cookie[SESSION_COOKIE]!;
  c.value = did;
  c.httpOnly = true;
  c.sameSite = "lax";
  c.secure = env.NODE_ENV === "production";
  c.path = "/";
  c.maxAge = MAX_AGE_SECONDS;
}

export function clearSessionCookie(cookie: CookieJar): void {
  const c = cookie[SESSION_COOKIE]!;
  c.value = "";
  c.httpOnly = true;
  c.sameSite = "lax";
  c.secure = env.NODE_ENV === "production";
  c.path = "/";
  c.maxAge = 0;
  c.remove();
}

export function readSessionDid(cookie: CookieJar): string | null {
  const v = cookie[SESSION_COOKIE]?.value;
  return typeof v === "string" && v.length > 0 ? v : null;
}
