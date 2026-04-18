import { Elysia, t } from "elysia";
import { z } from "zod";
import { trackEvent, type SubjectType } from "../analytics/track";
import { listTrending } from "../analytics/trending";
import { checkIpRate } from "../lib/ip-rate-limit";

const viewBody = z.object({
  subjectUri: z.string().min(1).max(512),
  subjectType: z.enum(["question", "profile", "tag"]),
});

type ElysiaCtx = {
  request: Request;
  server?: {
    requestIP?: (request: Request) => { address?: string } | null;
  } | null;
};

function extractClientIp(ctx: ElysiaCtx): string {
  const xff = ctx.request.headers.get("x-forwarded-for");
  if (xff) {
    const first = xff.split(",")[0]?.trim();
    if (first) return first;
  }
  const xri = ctx.request.headers.get("x-real-ip");
  if (xri) return xri.trim();
  const addr = ctx.server?.requestIP?.(ctx.request)?.address;
  return addr ?? "unknown";
}

function referrerHost(ctx: ElysiaCtx): string | null {
  const raw = ctx.request.headers.get("referer") ?? ctx.request.headers.get("referrer");
  if (!raw) return null;
  try {
    return new URL(raw).host || null;
  } catch {
    return null;
  }
}

export const analyticsRoutes = new Elysia({ prefix: "/api" })
  .post(
    "/analytics/view",
    async (ctx) => {
      const ip = extractClientIp(ctx);
      if (!checkIpRate(ip)) {
        ctx.set.status = 429;
        return { error: "rate_limited", message: "Too many requests" };
      }
      const parsed = viewBody.safeParse(ctx.body);
      if (!parsed.success) {
        // Intentionally return 204 on bad input too — don't leak validation
        // state to noise-makers.
        ctx.set.status = 204;
        return;
      }
      const userAgent = ctx.request.headers.get("user-agent") ?? "";
      try {
        await trackEvent({
          eventType: "view",
          subjectUri: parsed.data.subjectUri,
          subjectType: parsed.data.subjectType as SubjectType,
          ip,
          userAgent,
          referrerHost: referrerHost(ctx),
        });
      } catch (err) {
        console.error("[analytics] view tracking failed:", err);
        // Plan: "analytics are non-essential, never let them take down the
        // read path." We surface 503 so the client knows, but never crash.
        ctx.set.status = 503;
        return;
      }
      ctx.set.status = 204;
      return;
    },
    { body: t.Any() },
  )
  .post(
    "/analytics/share",
    async (ctx) => {
      const ip = extractClientIp(ctx);
      if (!checkIpRate(ip)) {
        ctx.set.status = 429;
        return { error: "rate_limited", message: "Too many requests" };
      }
      const parsed = viewBody.safeParse(ctx.body);
      if (!parsed.success) {
        ctx.set.status = 204;
        return;
      }
      try {
        await trackEvent({
          eventType: "share",
          subjectUri: parsed.data.subjectUri,
          subjectType: parsed.data.subjectType as SubjectType,
          ip,
          userAgent: ctx.request.headers.get("user-agent") ?? "",
          referrerHost: referrerHost(ctx),
        });
      } catch (err) {
        console.error("[analytics] share tracking failed:", err);
        ctx.set.status = 503;
        return;
      }
      ctx.set.status = 204;
      return;
    },
    { body: t.Any() },
  )
  .get(
    "/trending",
    async ({ query }) => {
      const window = query.window === "24h" ? "24h" : "7d";
      const limit = Math.min(Math.max(query.limit ?? 20, 1), 50);
      const items = await listTrending({ window, limit });
      return { items, cursor: null };
    },
    {
      query: t.Object({
        window: t.Optional(t.String()),
        limit: t.Optional(t.Numeric()),
      }),
    },
  );
