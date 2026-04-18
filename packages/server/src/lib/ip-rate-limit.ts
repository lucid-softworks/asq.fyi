/**
 * In-process per-IP sliding window rate limiter.
 *
 * Used for the public analytics endpoint so a single abusive IP can't drown
 * the view-tracking pipeline. Not shared across replicas; that's deliberate —
 * analytics is non-essential and a soft per-instance cap is sufficient.
 */

const WINDOW_MS = 60_000;
const LIMIT_PER_WINDOW = 60;

interface Bucket {
  resetAt: number;
  count: number;
}

const buckets = new Map<string, Bucket>();

export function checkIpRate(ip: string): boolean {
  const now = Date.now();
  const existing = buckets.get(ip);
  if (!existing || existing.resetAt <= now) {
    buckets.set(ip, { resetAt: now + WINDOW_MS, count: 1 });
    maybeGc(now);
    return true;
  }
  existing.count += 1;
  return existing.count <= LIMIT_PER_WINDOW;
}

let lastGc = 0;
function maybeGc(now: number): void {
  if (now - lastGc < WINDOW_MS) return;
  lastGc = now;
  for (const [ip, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(ip);
  }
}
