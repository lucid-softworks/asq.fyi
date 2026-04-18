import { randomBytes } from "node:crypto";
import { eq, sql } from "drizzle-orm";
import { db } from "../db/client";
import { analyticsSalts } from "../db/schema";

const CACHE_TTL_MS = 60_000;

interface CacheEntry {
  salt: Buffer;
  expiresAt: number;
}

const cache = new Map<string, CacheEntry>();

function utcDay(now = new Date()): string {
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, "0");
  const d = String(now.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function toBuffer(value: unknown): Buffer | null {
  if (Buffer.isBuffer(value)) return value;
  if (value instanceof Uint8Array) return Buffer.from(value);
  if (typeof value === "string") {
    // postgres-js may hand bytea back as '\x…' hex form
    if (value.startsWith("\\x")) return Buffer.from(value.slice(2), "hex");
  }
  return null;
}

/**
 * Get the 32-byte salt for the given UTC day, lazily creating one in Postgres
 * if none exists. Race-safe across replicas: `on conflict do nothing` picks a
 * single winner and every caller reads back the same bytes.
 */
export async function getSalt(date: Date = new Date()): Promise<Buffer> {
  const day = utcDay(date);
  const cached = cache.get(day);
  const now = Date.now();
  if (cached && cached.expiresAt > now) return cached.salt;

  // Try to insert a fresh 32-byte salt for today; if another writer wins,
  // the row is already there and we just read it.
  const proposed = randomBytes(32);
  await db
    .insert(analyticsSalts)
    .values({ day, salt: proposed })
    .onConflictDoNothing({ target: analyticsSalts.day });

  const rows = await db
    .select({ salt: analyticsSalts.salt })
    .from(analyticsSalts)
    .where(eq(analyticsSalts.day, day))
    .limit(1);

  const raw = rows[0]?.salt;
  const buf = toBuffer(raw);
  if (!buf) {
    throw new Error(`analytics salt missing for ${day}`);
  }
  cache.set(day, { salt: buf, expiresAt: now + CACHE_TTL_MS });
  return buf;
}

/** Removes salts older than 2 days. Invoked from the daily cleanup job. */
export async function pruneOldSalts(): Promise<number> {
  const rows = await db
    .delete(analyticsSalts)
    .where(sql`${analyticsSalts.day} < current_date - interval '2 days'`)
    .returning({ day: analyticsSalts.day });
  cache.clear();
  return rows.length;
}
