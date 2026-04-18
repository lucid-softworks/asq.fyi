/**
 * Production static server for the SPA bundle.
 *
 * Serves files from `dist/`. For `/q/:did/:rkey` requests (question detail
 * pages) it fetches the question JSON from the API and injects OG/Twitter
 * meta tags into the HTML shell before serving it, so social unfurls
 * (Bluesky, Slack, etc.) show a proper preview.
 *
 * This is intentionally *not* SSR — no React rendering happens on the
 * server, just string-replacement in <head>.
 */
import { readFileSync, existsSync, statSync } from "node:fs";
import { extname, join, normalize, resolve } from "node:path";

const DIST = resolve(import.meta.dir, "dist");
const PORT = Number(process.env.PORT ?? 8080);
const API_URL = process.env.PUBLIC_API_URL ?? "http://127.0.0.1:3000";
const SITE_URL = process.env.PUBLIC_WEB_URL ?? "https://asq.fyi";

const INDEX_HTML = readFileSync(join(DIST, "index.html"), "utf8");

const MIME: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".json": "application/json; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".xml": "application/xml; charset=utf-8",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

function htmlEscape(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

interface QuestionOg {
  title: string;
  body: string;
  authorDid: string;
  authorHandle: string | null;
  authorDisplayName: string | null;
  tags: string[];
}

async function fetchQuestionOg(
  did: string,
  rkey: string,
  signal: AbortSignal,
): Promise<QuestionOg | null> {
  const uri = `at://${did}/fyi.asq.question/${rkey}`;
  const res = await fetch(
    `${API_URL}/api/questions/${encodeURIComponent(uri)}`,
    { signal },
  );
  if (!res.ok) return null;
  const data = (await res.json()) as {
    title: string;
    body: string;
    author: {
      did: string;
      handle: string | null;
      displayName: string | null;
    };
    tags: string[];
  };
  return {
    title: data.title,
    body: data.body,
    authorDid: data.author.did,
    authorHandle: data.author.handle,
    authorDisplayName: data.author.displayName,
    tags: data.tags,
  };
}

function injectOg(html: string, url: string, og: QuestionOg): string {
  const fullTitle = `${og.title} — asq.fyi`;
  const desc = og.body
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 280);
  const authorLabel =
    og.authorDisplayName ||
    (og.authorHandle ? `@${og.authorHandle}` : og.authorDid);
  const fallbackDesc = `Asked by ${authorLabel}`;
  const description = desc || fallbackDesc;

  const tags = [
    `<title>${htmlEscape(fullTitle)}</title>`,
    `<meta name="description" content="${htmlEscape(description)}" />`,
    `<link rel="canonical" href="${htmlEscape(url)}" />`,
    `<meta property="og:type" content="article" />`,
    `<meta property="og:title" content="${htmlEscape(fullTitle)}" />`,
    `<meta property="og:description" content="${htmlEscape(description)}" />`,
    `<meta property="og:url" content="${htmlEscape(url)}" />`,
    `<meta property="og:site_name" content="asq.fyi" />`,
    `<meta property="article:author" content="${htmlEscape(authorLabel)}" />`,
    ...og.tags.map(
      (t) =>
        `<meta property="article:tag" content="${htmlEscape(t)}" />`,
    ),
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${htmlEscape(fullTitle)}" />`,
    `<meta name="twitter:description" content="${htmlEscape(description)}" />`,
  ].join("\n    ");

  // Replace the default <title>…</title> and drop any default-url meta; our
  // injected block is authoritative for question pages.
  return html
    .replace(/<title>[^<]*<\/title>/, "")
    .replace(
      /<meta[^>]*(name|property)="(description|og:title|og:description|og:url|og:type|twitter:card|twitter:title|twitter:description)"[^>]*>\s*/g,
      "",
    )
    .replace(
      /<link rel="canonical"[^>]*>\s*/g,
      "",
    )
    .replace("</head>", `    ${tags}\n  </head>`);
}

function serveFile(path: string): Response | null {
  const safe = normalize(path).replace(/^(?:\.\.\/?)+/, "");
  const full = join(DIST, safe);
  if (!full.startsWith(DIST)) return null;
  if (!existsSync(full)) return null;
  const stat = statSync(full);
  if (stat.isDirectory()) return null;
  const ext = extname(full);
  const mime = MIME[ext] ?? "application/octet-stream";
  const cacheable =
    ext === ".js" || ext === ".css" || ext === ".woff" || ext === ".woff2";
  return new Response(Bun.file(full), {
    headers: {
      "content-type": mime,
      "cache-control": cacheable
        ? "public, max-age=31536000, immutable"
        : "public, max-age=300",
    },
  });
}

function isQuestionPath(path: string): { did: string; rkey: string } | null {
  const m = path.match(/^\/q\/([^/]+)\/([^/]+)\/?$/);
  if (!m) return null;
  return { did: decodeURIComponent(m[1]!), rkey: decodeURIComponent(m[2]!) };
}

const server = Bun.serve({
  port: PORT,
  async fetch(request) {
    const url = new URL(request.url);

    // 1) Direct static file hits win first.
    const direct = serveFile(url.pathname);
    if (direct) return direct;

    // 2) Question detail page → OG injection
    const q = isQuestionPath(url.pathname);
    if (q) {
      const canonical = `${SITE_URL}${url.pathname}`;
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 2_500);
      try {
        const og = await fetchQuestionOg(q.did, q.rkey, controller.signal);
        if (og) {
          const html = injectOg(INDEX_HTML, canonical, og);
          return new Response(html, {
            headers: {
              "content-type": "text/html; charset=utf-8",
              "cache-control": "public, max-age=120",
            },
          });
        }
      } catch {
        /* fall through to plain shell */
      } finally {
        clearTimeout(timer);
      }
      // No data or fetch failed — serve the plain SPA shell. Client-side
      // router will show the 404 state.
      return new Response(INDEX_HTML, {
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }

    // 3) Everything else → SPA shell (client-side routing)
    return new Response(INDEX_HTML, {
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  },
});

console.log(`[web] listening on http://localhost:${server.port}`);
console.log(`[web] serving ${DIST}`);
console.log(`[web] OG API: ${API_URL}`);

const shutdown = () => {
  console.log("[web] shutting down");
  server.stop();
  process.exit(0);
};
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
