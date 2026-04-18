import { sql } from "drizzle-orm";
import { db } from "../db/client";
import { rateLimits } from "../db/schema";

export type RateLimitAction = "questions" | "answers" | "comments" | "votes";

const LIMITS: Record<RateLimitAction, number> = {
  questions: 10,
  answers: 50,
  comments: 100,
  votes: 500,
};

export interface RateLimitStatus {
  remaining: number;
  limit: number;
  resetAt: Date;
}

function tomorrowUtcMidnight(): Date {
  const d = new Date();
  d.setUTCHours(24, 0, 0, 0);
  return d;
}

function utcDateString(now = new Date()): string {
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, "0");
  const d = String(now.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export class RateLimitExceededError extends Error {
  constructor(
    public action: RateLimitAction,
    public status: RateLimitStatus,
  ) {
    super(`rate limit exceeded for ${action}`);
  }
}

export async function consumeRateLimit(
  did: string,
  action: RateLimitAction,
): Promise<RateLimitStatus> {
  const limit = LIMITS[action];
  const day = utcDateString();
  const rows = await db.execute<{ count: number }>(sql`
    insert into ${rateLimits} (did, action, day, count)
    values (${did}, ${action}, ${day}, 1)
    on conflict (did, action, day)
    do update set count = ${rateLimits.count} + 1
    returning count
  `);
  const count = rows[0]?.count ?? 0;
  const status: RateLimitStatus = {
    limit,
    remaining: Math.max(0, limit - count),
    resetAt: tomorrowUtcMidnight(),
  };
  if (count > limit) {
    throw new RateLimitExceededError(action, status);
  }
  return status;
}
