# asq.fyi

A Q&A platform built on the AT Protocol. Questions, answers, votes, and comments are stored as records in each user's Personal Data Server (PDS); this app is a view over those records.

## Stack

- **Web + API:** TanStack Start (Vite + Nitro SSR, React 19)
- **Database:** Postgres via Drizzle
- **Auth:** ATProto OAuth (no app passwords)
- **Ingest:** Jetstream WebSocket worker → Postgres cache
- **Hosting:** Railway (web + ingester as two services)

## Architecture

```
                +-------------------+
  Bluesky PDS   |   ATProto OAuth   |
  (any host) <-+| (user's chosen    |<-------+ user browser
                |  handle -> PDS)   |        |
                +---------+---------+        |
                          ^                  | cookie-auth fetch
                          |  createRecord    v
                          |             +----+-------------+
                          |             |  apps/web        |
                          |             |  TanStack Start  |
                          |             |  - SSR + head()  |
                          |             |  - /api/* server |
                          |             |    routes        |
                          |             |  - /auth/*       |
                          +-------------+    OAuth flow    |
                                        +----+-------------+
                                             |
                                             | drizzle
                                             v
  Jetstream WS ---> +---------------+     Postgres
  (all fyi.asq.*)   | apps/ingester |---> (cache +
                    | (standalone   |     analytics)
                    |  Bun process) |
                    +---------------+
```

Records of truth live on each user's PDS. Postgres is a rebuildable cache
populated by the Jetstream firehose.

## Layout

```
apps/web/              TanStack Start app — UI + /api/* + /auth/* + /health
apps/ingester/         Bun process consuming the Jetstream firehose
packages/server/       Shared server code (db, atproto, analytics,
                       jetstream, oauth) imported by apps/web + ingester
packages/lexicons/     fyi.asq.* lexicon JSON + codegen output
packages/shared/       Shared zod input schemas (client + server)
```

## Local development

**Requires**: Bun 1.1+, Postgres 16+.

1. Install deps at the repo root:
   ```
   bun install
   ```
2. Start Postgres (e.g. via Docker):
   ```
   docker run -d --name asq-pg \
     -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=asq \
     -p 5432:5432 postgres:16-alpine
   ```
3. Copy `.env.example` → `.env` and fill in values:
   - `DATABASE_URL` — pointing at your local Postgres
   - `COOKIE_SECRET` — any 32+ byte secret
   - `OAUTH_PRIVATE_KEY_1` — leave blank in dev; the web app will
     generate an ephemeral ES256 key at `packages/server/.dev-oauth-key.pem`
     on first run
4. Run the web app and the ingester:
   ```
   bun run dev          # web on :5173
   bun run dev:ingester # (second terminal) Jetstream ingester
   ```

Visit <http://127.0.0.1:5173> — use `127.0.0.1` (not `localhost`) locally so
ATProto OAuth's loopback-client rules accept the redirect URI.

### Key scripts

| command                  | what it does                                   |
|--------------------------|------------------------------------------------|
| `bun run dev`            | TanStack Start web dev server with `--watch`   |
| `bun run dev:ingester`   | Jetstream worker                               |
| `bun run typecheck`      | tsc --noEmit across all workspaces             |
| `bun run build`          | production build (lexicons + shared + web)     |
| `bun run db:generate`    | create migration from schema.ts diff           |
| `bun run db:migrate`     | apply migrations to DATABASE_URL               |
| `bun run db:studio`      | drizzle-kit studio for DB inspection           |

## Env vars

See `.env.example`. The `@asq/server` package's `env.ts` validates with zod
at boot and fails fast if anything required is missing.

```
NODE_ENV=development
DATABASE_URL=postgres://...
PUBLIC_API_URL=http://127.0.0.1:5173   # same origin as web in the unified app
PUBLIC_WEB_URL=http://127.0.0.1:5173
COOKIE_SECRET=change-me-to-32-bytes
OAUTH_PRIVATE_KEY_1=                    # required in prod; PEM w/ \n escapes
JETSTREAM_URL=wss://jetstream2.us-east.bsky.network/subscribe
```

## Deployment

Two Railway services from the same repo + a Postgres plugin:

1. **web** — `bun run start:web`, domains `asq.fyi` + `www.asq.fyi` +
   `api.asq.fyi` (all three on the same service now)
2. **ingester** — `bun run start:ingester`, no public domain

Build command at the repo root: `bun run build`.
Start commands use the workspace scripts above.

TanStack Start's Nitro output at `apps/web/.output/server/index.mjs` is the
web service's entrypoint. SSR renders `/q/:did/:rkey` with `og:title` /
`og:description` / `article:author` / `article:tag` meta for Bluesky and
Slack unfurls — replacing the previous string-injection static server.

Deploy order on first setup: web → verify migrations → ingester.

## Privacy

See [`/privacy`](https://asq.fyi/privacy). Analytics are first-party,
anonymous, and described in full there.

## Deferred work

See [`FUTURE.md`](./FUTURE.md).
