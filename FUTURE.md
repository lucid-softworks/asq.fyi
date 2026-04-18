# Future work

Deferred features and ideas that are intentionally out of scope for v1.

## Social

- Follows, feeds of people you follow
- Notifications (answer on your question, mention, etc.)
- DMs
- Reactions beyond up/down

## Moderation

- Report / flag content
- Block users
- Admin moderation queue
- Community-labeled hide lists (ATProto labeler integration)

## Federation

- Interop with other ATProto Q&A apps
- Cross-app record references (e.g. answer to a Bluesky post)
- App-level labelers

## Analytics

- Funnels and retention (without compromising anonymity)
- Author-facing view breakdown per question
- Surface `lastRollupAt` on `/health` alongside `jetstreamLagSeconds`

## Performance

- **Route-level code splitting.** The current SPA bundle is ~800 KB minified
  (~230 KB gzip); lazy-loading `QuestionDetail`, `Ask`, `Profile`, `Privacy`
  should drop the landing bundle significantly.
- **Full SSR / prerendering.** The OG-tag injection in `apps/web/server.ts`
  gives us social unfurls without React running on the server, but doesn't
  help first-paint for crawlers or time-to-meaningful-paint for real users.
  Moving to a React SSR setup (or a bot-aware prerender service) is a clear
  next step.
- **Sitemap generation.** The `sitemap.xml` today is hand-curated static.
  Once we have real question volume, generate it from Postgres (top N
  recent + top M trending, split into shards if needed).

## Platform

- Mobile apps (ATProto-native, using the same PDS records)
- Rich embeds when a question URL is pasted into Bluesky (depends on
  Bluesky appview support for external app-level OG)
- Localization beyond English (the `to_tsvector('english', ...)` call in
  `questions.search` would need per-language variants)
- Dark mode

## Scaling

- **Leader election for the analytics scheduler.** Currently the 5-minute
  rollup runs per-instance; upserts are idempotent so correctness is fine,
  but running N copies of the rollup on N replicas is wasteful. A simple
  Postgres advisory lock would be enough.
- **Shared request-lock for OAuth.** The `@atproto/oauth-client-node`
  `requestLocalLock` is in-process; a multi-replica API deployment should
  swap in a Postgres-backed lock (or Redis) to avoid simultaneous token
  refreshes across replicas.
- **Search.** Postgres FTS is fine for v1. If volume grows past ~1M
  questions, either switch to a dedicated search index (Meilisearch, etc.)
  or add partial indexes for common query patterns.

## Developer experience

- **OAuth dev story.** Today the loopback client works out of the box for
  `127.0.0.1` but testing the prod-style confidential client path (with
  `private_key_jwt` + a real `jwks.json`) requires a public tunnel. A
  documented ngrok/cloudflare-tunnel recipe in the README would help.
- **Seed data script.** For demoing the UI, a script that posts a handful
  of fake `fyi.asq.*` records to a test DID would be useful. Deleted with
  M6 cleanup; bring back as a dev-only helper.
- **Typed shared response types.** Today the web types (`QuestionCard`,
  `QuestionDetail`, etc.) are duplicated in `apps/web/src/lib/types.ts`.
  Moving them into `packages/shared` (as type-only exports) would keep the
  two sides in lockstep.
