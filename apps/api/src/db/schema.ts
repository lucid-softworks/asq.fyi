import { sql } from "drizzle-orm";
import {
  bigint,
  bigserial,
  check,
  customType,
  date,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

const bytea = customType<{ data: Buffer; notNull: true; default: false }>({
  dataType() {
    return "bytea";
  },
});

const tsvector = customType<{ data: string }>({
  dataType() {
    return "tsvector";
  },
});

export const profiles = pgTable(
  "profiles",
  {
    did: text("did").primaryKey(),
    handle: text("handle"),
    displayName: text("display_name"),
    avatarUrl: text("avatar_url"),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("profiles_handle_idx").on(t.handle)],
);

export const questions = pgTable(
  "questions",
  {
    uri: text("uri").primaryKey(),
    cid: text("cid").notNull(),
    authorDid: text("author_did").notNull(),
    title: text("title").notNull(),
    body: text("body").notNull(),
    tags: text("tags").array().notNull().default(sql`'{}'::text[]`),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    indexedAt: timestamp("indexed_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    acceptedAnswerUri: text("accepted_answer_uri"),
    score: integer("score").notNull().default(0),
    answerCount: integer("answer_count").notNull().default(0),
    commentCount: integer("comment_count").notNull().default(0),
    search: tsvector("search").generatedAlwaysAs(
      sql`setweight(to_tsvector('english', coalesce(title,'')), 'A') || setweight(to_tsvector('english', coalesce(body,'')), 'B')`,
    ),
  },
  (t) => [
    index("questions_created_at_idx").on(t.createdAt.desc()),
    index("questions_score_idx").on(t.score.desc(), t.createdAt.desc()),
    index("questions_author_idx").on(t.authorDid, t.createdAt.desc()),
    index("questions_tags_idx").using("gin", t.tags),
    index("questions_search_idx").using("gin", t.search),
  ],
);

export const answers = pgTable(
  "answers",
  {
    uri: text("uri").primaryKey(),
    cid: text("cid").notNull(),
    authorDid: text("author_did").notNull(),
    questionUri: text("question_uri").notNull(),
    body: text("body").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    indexedAt: timestamp("indexed_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    score: integer("score").notNull().default(0),
    commentCount: integer("comment_count").notNull().default(0),
  },
  (t) => [
    index("answers_question_idx").on(
      t.questionUri,
      t.score.desc(),
      t.createdAt.asc(),
    ),
    index("answers_author_idx").on(t.authorDid, t.createdAt.desc()),
  ],
);

export const comments = pgTable(
  "comments",
  {
    uri: text("uri").primaryKey(),
    cid: text("cid").notNull(),
    authorDid: text("author_did").notNull(),
    subjectUri: text("subject_uri").notNull(),
    parentUri: text("parent_uri"),
    body: text("body").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    indexedAt: timestamp("indexed_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("comments_subject_idx").on(t.subjectUri, t.createdAt.asc()),
    index("comments_parent_idx").on(t.parentUri),
  ],
);

export const votes = pgTable(
  "votes",
  {
    uri: text("uri").primaryKey(),
    authorDid: text("author_did").notNull(),
    subjectUri: text("subject_uri").notNull(),
    direction: text("direction").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    indexedAt: timestamp("indexed_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("votes_author_subject_idx").on(t.authorDid, t.subjectUri),
    index("votes_subject_idx").on(t.subjectUri),
    check("votes_direction_check", sql`${t.direction} in ('up','down')`),
  ],
);

export const acceptedAnswers = pgTable(
  "accepted_answers",
  {
    uri: text("uri").primaryKey(),
    authorDid: text("author_did").notNull(),
    questionUri: text("question_uri").notNull(),
    answerUri: text("answer_uri").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    indexedAt: timestamp("indexed_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [uniqueIndex("accepted_answers_question_idx").on(t.questionUri)],
);

export const jetstreamCursor = pgTable(
  "jetstream_cursor",
  {
    id: integer("id").primaryKey(),
    cursor: bigint("cursor", { mode: "number" }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [check("jetstream_cursor_singleton", sql`${t.id} = 1`)],
);

export const rateLimits = pgTable(
  "rate_limits",
  {
    did: text("did").notNull(),
    action: text("action").notNull(),
    day: date("day").notNull(),
    count: integer("count").notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.did, t.action, t.day] })],
);

export const analyticsEvents = pgTable(
  "analytics_events",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    eventType: text("event_type").notNull(),
    subjectUri: text("subject_uri").notNull(),
    subjectType: text("subject_type").notNull(),
    visitorHash: text("visitor_hash").notNull(),
    referrerHost: text("referrer_host"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    check(
      "analytics_events_event_type_check",
      sql`${t.eventType} in ('view','share')`,
    ),
    check(
      "analytics_events_subject_type_check",
      sql`${t.subjectType} in ('question','profile','tag')`,
    ),
    index("analytics_events_subject_time_idx").on(
      t.subjectUri,
      t.createdAt.desc(),
    ),
    index("analytics_events_created_at_idx").on(t.createdAt),
    index("analytics_events_dedupe_idx").on(
      t.subjectUri,
      t.visitorHash,
      t.createdAt,
    ),
  ],
);

export const analyticsQuestionStats = pgTable(
  "analytics_question_stats",
  {
    questionUri: text("question_uri").primaryKey(),
    viewsTotal: integer("views_total").notNull().default(0),
    views7d: integer("views_7d").notNull().default(0),
    views24h: integer("views_24h").notNull().default(0),
    uniqueVisitors7d: integer("unique_visitors_7d").notNull().default(0),
    lastViewedAt: timestamp("last_viewed_at", { withTimezone: true }),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("analytics_question_views_7d_idx").on(t.views7d.desc()),
    index("analytics_question_views_24h_idx").on(t.views24h.desc()),
  ],
);

export const analyticsTagStats = pgTable(
  "analytics_tag_stats",
  {
    tag: text("tag").primaryKey(),
    views7d: integer("views_7d").notNull().default(0),
    questionCount: integer("question_count").notNull().default(0),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("analytics_tag_views_7d_idx").on(t.views7d.desc())],
);

export const analyticsSalts = pgTable("analytics_salts", {
  day: date("day").primaryKey(),
  salt: bytea("salt").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const oauthAuthState = pgTable(
  "oauth_auth_state",
  {
    key: text("key").primaryKey(),
    value: jsonb("value").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
  },
  (t) => [index("oauth_auth_state_expires_at_idx").on(t.expiresAt)],
);

export const oauthSessions = pgTable(
  "oauth_sessions",
  {
    key: text("key").primaryKey(),
    value: jsonb("value").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
  },
  (t) => [index("oauth_sessions_expires_at_idx").on(t.expiresAt)],
);
