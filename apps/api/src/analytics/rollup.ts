import { sql } from "drizzle-orm";
import { db } from "../db/client";
import {
  analyticsEvents,
  analyticsQuestionStats,
  analyticsTagStats,
  questions,
} from "../db/schema";

const ROLLUP_WINDOW = sql`interval '5 minutes'`;
const SEVEN_DAYS = sql`interval '7 days'`;
const TWENTY_FOUR_HOURS = sql`interval '24 hours'`;

/**
 * Recompute question and tag stats for anything that received a view event
 * in the recent window. Idempotent; safe to run concurrently (upserts).
 */
export async function rollupRecent(): Promise<{
  questions: number;
  tags: number;
}> {
  const qRows = await db.execute<{ cnt: number }>(sql`
    with recent as (
      select distinct subject_uri
      from ${analyticsEvents}
      where ${analyticsEvents.eventType} = 'view'
        and ${analyticsEvents.subjectType} = 'question'
        and ${analyticsEvents.createdAt} >= now() - ${ROLLUP_WINDOW}
    ),
    updated as (
      insert into ${analyticsQuestionStats} (
        question_uri, views_total, views_7d, views_24h,
        unique_visitors_7d, last_viewed_at, updated_at
      )
      select
        r.subject_uri,
        (select count(*) from ${analyticsEvents} e
          where e.subject_uri = r.subject_uri and e.event_type = 'view')::int,
        (select count(*) from ${analyticsEvents} e
          where e.subject_uri = r.subject_uri and e.event_type = 'view'
            and e.created_at >= now() - ${SEVEN_DAYS})::int,
        (select count(*) from ${analyticsEvents} e
          where e.subject_uri = r.subject_uri and e.event_type = 'view'
            and e.created_at >= now() - ${TWENTY_FOUR_HOURS})::int,
        (select count(distinct e.visitor_hash) from ${analyticsEvents} e
          where e.subject_uri = r.subject_uri and e.event_type = 'view'
            and e.created_at >= now() - ${SEVEN_DAYS})::int,
        (select max(e.created_at) from ${analyticsEvents} e
          where e.subject_uri = r.subject_uri and e.event_type = 'view'),
        now()
      from recent r
      where exists (select 1 from ${questions} q where q.uri = r.subject_uri)
      on conflict (question_uri) do update set
        views_total = excluded.views_total,
        views_7d = excluded.views_7d,
        views_24h = excluded.views_24h,
        unique_visitors_7d = excluded.unique_visitors_7d,
        last_viewed_at = excluded.last_viewed_at,
        updated_at = now()
      returning 1 as touched
    )
    select count(*)::int as cnt from updated
  `);

  const tRows = await db.execute<{ cnt: number }>(sql`
    with recent_tags as (
      select distinct unnest(q.tags) as tag
      from ${questions} q
      join ${analyticsEvents} e on e.subject_uri = q.uri
      where e.event_type = 'view'
        and e.created_at >= now() - ${ROLLUP_WINDOW}
    ),
    updated as (
      insert into ${analyticsTagStats} (tag, views_7d, question_count, updated_at)
      select
        rt.tag,
        coalesce((
          select sum(coalesce(s.views_7d, 0))
          from ${questions} q
          left join ${analyticsQuestionStats} s on s.question_uri = q.uri
          where rt.tag = any(q.tags)
        ), 0)::int,
        (select count(*)::int from ${questions} q where rt.tag = any(q.tags)),
        now()
      from recent_tags rt
      on conflict (tag) do update set
        views_7d = excluded.views_7d,
        question_count = excluded.question_count,
        updated_at = now()
      returning 1 as touched
    )
    select count(*)::int as cnt from updated
  `);

  return { questions: qRows[0]?.cnt ?? 0, tags: tRows[0]?.cnt ?? 0 };
}

/** Recompute stats for EVERY question. Used by the daily cleanup job. */
export async function fullRebuild(): Promise<{ questions: number; tags: number }> {
  const qRows = await db.execute<{ cnt: number }>(sql`
    with updated as (
      insert into ${analyticsQuestionStats} (
        question_uri, views_total, views_7d, views_24h,
        unique_visitors_7d, last_viewed_at, updated_at
      )
      select
        q.uri,
        (select count(*) from ${analyticsEvents} e
          where e.subject_uri = q.uri and e.event_type = 'view')::int,
        (select count(*) from ${analyticsEvents} e
          where e.subject_uri = q.uri and e.event_type = 'view'
            and e.created_at >= now() - ${SEVEN_DAYS})::int,
        (select count(*) from ${analyticsEvents} e
          where e.subject_uri = q.uri and e.event_type = 'view'
            and e.created_at >= now() - ${TWENTY_FOUR_HOURS})::int,
        (select count(distinct e.visitor_hash) from ${analyticsEvents} e
          where e.subject_uri = q.uri and e.event_type = 'view'
            and e.created_at >= now() - ${SEVEN_DAYS})::int,
        (select max(e.created_at) from ${analyticsEvents} e
          where e.subject_uri = q.uri and e.event_type = 'view'),
        now()
      from ${questions} q
      on conflict (question_uri) do update set
        views_total = excluded.views_total,
        views_7d = excluded.views_7d,
        views_24h = excluded.views_24h,
        unique_visitors_7d = excluded.unique_visitors_7d,
        last_viewed_at = excluded.last_viewed_at,
        updated_at = now()
      returning 1 as touched
    )
    select count(*)::int as cnt from updated
  `);

  const tRows = await db.execute<{ cnt: number }>(sql`
    with all_tags as (
      select distinct unnest(q.tags) as tag from ${questions} q
    ),
    updated as (
      insert into ${analyticsTagStats} (tag, views_7d, question_count, updated_at)
      select
        a.tag,
        coalesce((
          select sum(coalesce(s.views_7d, 0))
          from ${questions} q
          left join ${analyticsQuestionStats} s on s.question_uri = q.uri
          where a.tag = any(q.tags)
        ), 0)::int,
        (select count(*)::int from ${questions} q where a.tag = any(q.tags)),
        now()
      from all_tags a
      on conflict (tag) do update set
        views_7d = excluded.views_7d,
        question_count = excluded.question_count,
        updated_at = now()
      returning 1 as touched
    )
    select count(*)::int as cnt from updated
  `);

  return { questions: qRows[0]?.cnt ?? 0, tags: tRows[0]?.cnt ?? 0 };
}

export async function pruneOldEvents(): Promise<number> {
  const rows = await db.execute<{ cnt: number }>(sql`
    with deleted as (
      delete from ${analyticsEvents}
      where ${analyticsEvents.createdAt} < now() - interval '90 days'
      returning 1
    )
    select count(*)::int as cnt from deleted
  `);
  return rows[0]?.cnt ?? 0;
}
