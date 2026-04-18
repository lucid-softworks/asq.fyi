import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { trackEvent, type SubjectType } from "@asq/server/analytics/track";
import { checkIpRate } from "@asq/server/lib/ip-rate-limit";
import {
  error,
  noContent,
} from "../../../lib/server/responses";
import {
  extractClientIp,
  referrerHost,
} from "../../../lib/server/request";

const shareBody = z.object({
  subjectUri: z.string().min(1).max(512),
  subjectType: z.enum(["question", "profile", "tag"]),
});

export const Route = createFileRoute("/api/analytics/share")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const ip = extractClientIp(request);
        if (!checkIpRate(ip)) {
          return error(429, {
            error: "rate_limited",
            message: "Too many requests",
          });
        }
        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return noContent();
        }
        const parsed = shareBody.safeParse(body);
        if (!parsed.success) return noContent();

        try {
          await trackEvent({
            eventType: "share",
            subjectUri: parsed.data.subjectUri,
            subjectType: parsed.data.subjectType as SubjectType,
            ip,
            userAgent: request.headers.get("user-agent") ?? "",
            referrerHost: referrerHost(request),
          });
        } catch (err) {
          console.error("[analytics] share tracking failed:", err);
          return new Response(null, { status: 503 });
        }
        return noContent();
      },
    },
  },
});
