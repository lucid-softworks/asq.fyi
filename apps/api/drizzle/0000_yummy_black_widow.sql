CREATE TABLE "accepted_answers" (
	"uri" text PRIMARY KEY NOT NULL,
	"author_did" text NOT NULL,
	"question_uri" text NOT NULL,
	"answer_uri" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"indexed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "analytics_events" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"event_type" text NOT NULL,
	"subject_uri" text NOT NULL,
	"subject_type" text NOT NULL,
	"visitor_hash" text NOT NULL,
	"referrer_host" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "analytics_events_event_type_check" CHECK ("analytics_events"."event_type" in ('view','share')),
	CONSTRAINT "analytics_events_subject_type_check" CHECK ("analytics_events"."subject_type" in ('question','profile','tag'))
);
--> statement-breakpoint
CREATE TABLE "analytics_question_stats" (
	"question_uri" text PRIMARY KEY NOT NULL,
	"views_total" integer DEFAULT 0 NOT NULL,
	"views_7d" integer DEFAULT 0 NOT NULL,
	"views_24h" integer DEFAULT 0 NOT NULL,
	"unique_visitors_7d" integer DEFAULT 0 NOT NULL,
	"last_viewed_at" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "analytics_salts" (
	"day" date PRIMARY KEY NOT NULL,
	"salt" "bytea" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "analytics_tag_stats" (
	"tag" text PRIMARY KEY NOT NULL,
	"views_7d" integer DEFAULT 0 NOT NULL,
	"question_count" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "answers" (
	"uri" text PRIMARY KEY NOT NULL,
	"cid" text NOT NULL,
	"author_did" text NOT NULL,
	"question_uri" text NOT NULL,
	"body" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"indexed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"score" integer DEFAULT 0 NOT NULL,
	"comment_count" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "comments" (
	"uri" text PRIMARY KEY NOT NULL,
	"cid" text NOT NULL,
	"author_did" text NOT NULL,
	"subject_uri" text NOT NULL,
	"parent_uri" text,
	"body" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"indexed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "jetstream_cursor" (
	"id" integer PRIMARY KEY NOT NULL,
	"cursor" bigint NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "jetstream_cursor_singleton" CHECK ("jetstream_cursor"."id" = 1)
);
--> statement-breakpoint
CREATE TABLE "oauth_auth_state" (
	"key" text PRIMARY KEY NOT NULL,
	"value" jsonb NOT NULL,
	"expires_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "oauth_sessions" (
	"key" text PRIMARY KEY NOT NULL,
	"value" jsonb NOT NULL,
	"expires_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "profiles" (
	"did" text PRIMARY KEY NOT NULL,
	"handle" text,
	"display_name" text,
	"avatar_url" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "questions" (
	"uri" text PRIMARY KEY NOT NULL,
	"cid" text NOT NULL,
	"author_did" text NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"tags" text[] DEFAULT '{}'::text[] NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"indexed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"accepted_answer_uri" text,
	"score" integer DEFAULT 0 NOT NULL,
	"answer_count" integer DEFAULT 0 NOT NULL,
	"comment_count" integer DEFAULT 0 NOT NULL,
	"search" "tsvector" GENERATED ALWAYS AS (setweight(to_tsvector('english', coalesce(title,'')), 'A') || setweight(to_tsvector('english', coalesce(body,'')), 'B')) STORED
);
--> statement-breakpoint
CREATE TABLE "rate_limits" (
	"did" text NOT NULL,
	"action" text NOT NULL,
	"day" date NOT NULL,
	"count" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "rate_limits_did_action_day_pk" PRIMARY KEY("did","action","day")
);
--> statement-breakpoint
CREATE TABLE "votes" (
	"uri" text PRIMARY KEY NOT NULL,
	"author_did" text NOT NULL,
	"subject_uri" text NOT NULL,
	"direction" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"indexed_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "votes_direction_check" CHECK ("votes"."direction" in ('up','down'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX "accepted_answers_question_idx" ON "accepted_answers" USING btree ("question_uri");--> statement-breakpoint
CREATE INDEX "analytics_events_subject_time_idx" ON "analytics_events" USING btree ("subject_uri","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "analytics_events_created_at_idx" ON "analytics_events" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "analytics_events_dedupe_idx" ON "analytics_events" USING btree ("subject_uri","visitor_hash","created_at");--> statement-breakpoint
CREATE INDEX "analytics_question_views_7d_idx" ON "analytics_question_stats" USING btree ("views_7d" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "analytics_question_views_24h_idx" ON "analytics_question_stats" USING btree ("views_24h" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "analytics_tag_views_7d_idx" ON "analytics_tag_stats" USING btree ("views_7d" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "answers_question_idx" ON "answers" USING btree ("question_uri","score" DESC NULLS LAST,"created_at");--> statement-breakpoint
CREATE INDEX "answers_author_idx" ON "answers" USING btree ("author_did","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "comments_subject_idx" ON "comments" USING btree ("subject_uri","created_at");--> statement-breakpoint
CREATE INDEX "comments_parent_idx" ON "comments" USING btree ("parent_uri");--> statement-breakpoint
CREATE INDEX "oauth_auth_state_expires_at_idx" ON "oauth_auth_state" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "oauth_sessions_expires_at_idx" ON "oauth_sessions" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "profiles_handle_idx" ON "profiles" USING btree ("handle");--> statement-breakpoint
CREATE INDEX "questions_created_at_idx" ON "questions" USING btree ("created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "questions_score_idx" ON "questions" USING btree ("score" DESC NULLS LAST,"created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "questions_author_idx" ON "questions" USING btree ("author_did","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "questions_tags_idx" ON "questions" USING gin ("tags");--> statement-breakpoint
CREATE INDEX "questions_search_idx" ON "questions" USING gin ("search");--> statement-breakpoint
CREATE UNIQUE INDEX "votes_author_subject_idx" ON "votes" USING btree ("author_did","subject_uri");--> statement-breakpoint
CREATE INDEX "votes_subject_idx" ON "votes" USING btree ("subject_uri");