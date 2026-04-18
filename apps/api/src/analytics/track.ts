import { and, eq, gte, sql } from "drizzle-orm";
import { db } from "../db/client";
import {
  analyticsEvents,
  profiles,
  questions,
} from "../db/schema";
import { visitorHash } from "./visitor";
import { parseAtUri } from "../atproto/uri";

export type EventType = "view" | "share";
export type SubjectType = "question" | "profile" | "tag";

const DEDUP_WINDOW_MS = 60 * 60 * 1000; // 1 hour

interface TrackArgs {
  eventType: EventType;
  subjectUri: string;
  subjectType: SubjectType;
  ip: string;
  userAgent: string;
  referrerHost?: string | null;
}

async function subjectExists(
  subjectUri: string,
  subjectType: SubjectType,
): Promise<boolean> {
  if (subjectType === "question") {
    const r = await db
      .select({ uri: questions.uri })
      .from(questions)
      .where(eq(questions.uri, subjectUri))
      .limit(1);
    return r.length > 0;
  }
  if (subjectType === "profile") {
    const parsed = parseAtUri(subjectUri);
    if (parsed) {
      const r = await db
        .select({ did: profiles.did })
        .from(profiles)
        .where(eq(profiles.did, parsed.did))
        .limit(1);
      if (r.length > 0) return true;
    }
    // Also allow the raw DID form: subjectUri = did string
    if (subjectUri.startsWith("did:")) {
      const r = await db
        .select({ did: profiles.did })
        .from(profiles)
        .where(eq(profiles.did, subjectUri))
        .limit(1);
      return r.length > 0;
    }
    return false;
  }
  // tag: subjectUri is the tag string; always accept if the tag is any tag on any question
  const r = await db.execute<{ exists: boolean }>(sql`
    select exists(
      select 1 from ${questions} where ${subjectUri} = any(${questions.tags})
    ) as exists
  `);
  return Boolean(r[0]?.exists);
}

export interface TrackResult {
  /** true = new event inserted, false = deduped silently */
  recorded: boolean;
}

export async function trackEvent(args: TrackArgs): Promise<TrackResult> {
  const exists = await subjectExists(args.subjectUri, args.subjectType);
  if (!exists) return { recorded: false };

  const hash = await visitorHash(args.ip, args.userAgent, args.subjectUri);
  const since = new Date(Date.now() - DEDUP_WINDOW_MS);

  const prev = await db
    .select({ id: analyticsEvents.id })
    .from(analyticsEvents)
    .where(
      and(
        eq(analyticsEvents.subjectUri, args.subjectUri),
        eq(analyticsEvents.visitorHash, hash),
        gte(analyticsEvents.createdAt, since),
      ),
    )
    .limit(1);
  if (prev.length > 0) return { recorded: false };

  await db.insert(analyticsEvents).values({
    eventType: args.eventType,
    subjectUri: args.subjectUri,
    subjectType: args.subjectType,
    visitorHash: hash,
    referrerHost: args.referrerHost ?? null,
  });
  return { recorded: true };
}
