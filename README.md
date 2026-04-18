# asq.fyi

A Q&A platform built on the AT Protocol. Questions, answers, votes, and comments are stored as records in each user's Personal Data Server (PDS); this app is a view over those records.

## Stack

- **Backend:** Bun + Elysia + Drizzle + Postgres
- **Frontend:** React + Vite + Tailwind v4
- **Auth:** ATProto OAuth (no app passwords)
- **Ingest:** Jetstream WebSocket worker → Postgres cache
- **Hosting:** Railway (api, ingester, web as three services)

## Architecture

```
                +-------------------+
  Bluesky PDS   |   ATProto OAuth   |
  (any host) <-+| (user's chosen    |<-------+ user browser
                |  handle -> PDS)   |        |
                +---------+---------+        |
                          ^                  | cookie-auth XHR
                          |  createRecord    v
                +---------+---------+   +----+-------------+
                |  apps/api         |<--+  apps/web (SPA)  |
                |  Elysia + OAuth   |   |  Vite bundle     |
                |  read/write       |   |  OG injector for |
                |  routes           |   |  /q/:did/:rkey   |
                +----+----+---------+   +------------------+
                     ^    |
                     |    | drizzle
                     |    v
  Jetstream WS ------+--> Postgres  <---+
  (all fyi.asq.*)    |   (cache +       |
                     |    analytics)    |
                     |                  |
                +----+----------+       |
                |  ingester     |-------+
                |  (same code-  |
                |   base, sep.  |
                |   process)    |
                +---------------+
```

Records of truth live on each user's PDS. Postgres is a rebuildable cache
populated by the Jetstream firehose.

## Layout

```
apps/api/          Elysia HTTP API + OAuth + Jetstream ingester
apps/web/          React SPA + OG-injecting static server
packages/lexicons/ fyi.asq.* lexicon JSON + codegen output
packages/shared/   shared zod input schemas
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
   - `OAUTH_PRIVATE_KEY_1` — leave blank in dev; the API will generate an ephemeral ES256 key at `apps/api/.dev-oauth-key.pem` on first run
4. Run the API + web concurrently:
   ```
   bun run dev          # api on :3000, web on :5173
   bun run dev:ingester # (second terminal) Jetstream ingester
   ```

Visit <http://127.0.0.1:5173> — use `127.0.0.1` (not `localhost`) locally so ATProto OAuth's loopback-client rules accept the redirect URI.

### Key scripts

| command                       | what it does                                       |
|-------------------------------|----------------------------------------------------|
| `bun run dev`                 | api + web with `--watch`                           |
| `bun run dev:ingester`        | Jetstream worker                                   |
| `bun run typecheck`           | tsc --noEmit across all workspaces                 |
| `bun run build`               | lexicons + shared + web production build           |
| `bun --cwd apps/api db:generate` | create migration from schema.ts diff            |
| `bun --cwd apps/api db:migrate`  | apply migrations to DATABASE_URL                |
| `bun --cwd apps/api db:studio`   | drizzle-kit studio for DB inspection            |

## Env vars

See `.env.example`. The API's `env.ts` validates with zod at boot and fails fast if anything required is missing.

```
# Shared
NODE_ENV=development
DATABASE_URL=postgres://...

# API
PUBLIC_API_URL=http://127.0.0.1:3000   # https://api.asq.fyi in prod
PUBLIC_WEB_URL=http://127.0.0.1:5173   # https://asq.fyi in prod
COOKIE_SECRET=change-me-to-32-bytes
OAUTH_PRIVATE_KEY_1=                    # required in prod; PEM w/ \n escapes
JETSTREAM_URL=wss://jetstream2.us-east.bsky.network/subscribe

# Web
VITE_API_URL=http://127.0.0.1:3000
```

## Deployment

Three Railway services from the same repo + a Postgres plugin:

1. **api** — `bun run apps/api/src/index.ts`, domain `api.asq.fyi`
2. **ingester** — `bun run apps/api/src/ingester.ts`, no public domain
3. **web** — `bun run apps/web/server.ts`, domains `asq.fyi` + `www.asq.fyi`

Deploy order on first setup: api → verify migrations → ingester → web.

The production web service runs a small custom Bun static server (`apps/web/server.ts`) rather than `bunx serve`. It fetches `/api/questions/:uri` for `/q/:did/:rkey` and injects `og:title` / `og:description` / `article:author` / `article:tag` meta into the HTML shell, so Bluesky and Slack unfurl question URLs with a real preview. This is not SSR — React still renders on the client.

## Privacy

See [`/privacy`](https://asq.fyi/privacy). Analytics are first-party, anonymous, and described in full there.

## Deferred work

See [`FUTURE.md`](./FUTURE.md).
