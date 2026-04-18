import { env } from "./env";
import { ping, runMigrations, sql } from "./db/client";
import { loadCursor, saveCursor } from "./jetstream/cursor";
import { JETSTREAM_COLLECTIONS } from "./jetstream/collections";
import { handleCommit } from "./jetstream/handlers";
import type { JetstreamMessage } from "./jetstream/types";

await ping();
console.log("[ingester] connected to postgres");
if (env.NODE_ENV !== "production") {
  // In dev we still want migrations to be up-to-date; prod runs migrations
  // as part of the api service boot.
  await runMigrations();
  console.log("[ingester] migrations up to date");
}

let cursor = await loadCursor();
console.log(`[ingester] starting cursor: ${cursor}`);

let ws: WebSocket | null = null;
let reconnectDelay = 1_000;
const RECONNECT_MAX = 60_000;
let shuttingDown = false;
let cursorDirty = false;

const FLUSH_INTERVAL_MS = 5_000;
const flushTimer = setInterval(async () => {
  if (!cursorDirty) return;
  try {
    await saveCursor(cursor);
    cursorDirty = false;
  } catch (err) {
    console.error("[ingester] cursor flush failed:", err);
  }
}, FLUSH_INTERVAL_MS);

function buildUrl(): URL {
  const url = new URL(env.JETSTREAM_URL);
  for (const c of JETSTREAM_COLLECTIONS) {
    url.searchParams.append("wantedCollections", c);
  }
  if (cursor > 0) {
    url.searchParams.set("cursor", String(cursor));
  }
  return url;
}

function connect(): void {
  const url = buildUrl();
  console.log(`[ingester] connecting to ${url.toString()}`);
  ws = new WebSocket(url);

  ws.addEventListener("open", () => {
    console.log("[ingester] connected");
    reconnectDelay = 1_000;
  });

  ws.addEventListener("message", (event) => {
    void handleMessage(typeof event.data === "string" ? event.data : "");
  });

  ws.addEventListener("close", (event) => {
    console.log(
      `[ingester] disconnected (code=${event.code}${event.reason ? ` reason=${event.reason}` : ""})`,
    );
    if (!shuttingDown) scheduleReconnect();
  });

  ws.addEventListener("error", (event) => {
    // error is followed by close; log only for visibility
    const msg = "message" in event ? (event as unknown as { message: string }).message : "";
    console.error(`[ingester] socket error${msg ? `: ${msg}` : ""}`);
  });
}

function scheduleReconnect(): void {
  const delay = reconnectDelay;
  reconnectDelay = Math.min(reconnectDelay * 2, RECONNECT_MAX);
  console.log(`[ingester] reconnecting in ${delay}ms`);
  setTimeout(() => {
    if (!shuttingDown) connect();
  }, delay);
}

async function handleMessage(raw: string): Promise<void> {
  if (!raw) return;
  let msg: JetstreamMessage;
  try {
    msg = JSON.parse(raw) as JetstreamMessage;
  } catch {
    return;
  }
  if (typeof msg.time_us === "number" && msg.time_us > cursor) {
    cursor = msg.time_us;
    cursorDirty = true;
  }
  if (msg.kind !== "commit" || !msg.commit) return;

  try {
    await handleCommit(msg.did, msg.commit);
  } catch (err) {
    console.error(
      `[ingester] handler error at cursor=${cursor} for ${msg.did} ${msg.commit.collection}/${msg.commit.rkey}:`,
      err,
    );
  }
}

async function shutdown(): Promise<void> {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log("[ingester] shutting down");
  clearInterval(flushTimer);
  try {
    if (cursorDirty) await saveCursor(cursor);
  } catch (err) {
    console.error("[ingester] final cursor flush failed:", err);
  }
  try {
    ws?.close();
  } catch {
    /* ignore */
  }
  try {
    await sql.end({ timeout: 5 });
  } catch {
    /* ignore */
  }
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

connect();
