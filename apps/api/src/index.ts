import { Elysia } from "elysia";
import { cors } from "@elysiajs/cors";
import { env } from "./env";
import { ping, runMigrations, sql } from "./db/client";
import { questionsRoutes } from "./routes/questions";
import { profilesRoutes } from "./routes/profiles";
import { tagsRoutes } from "./routes/tags";
import { searchRoutes } from "./routes/search";
import { authRoutes } from "./routes/auth";
import { meRoutes } from "./routes/me";
import { writesRoutes } from "./routes/writes";
import { healthRoutes } from "./routes/health";
import { analyticsRoutes } from "./routes/analytics";
import { startAnalyticsScheduler } from "./analytics/scheduler";
import { SESSION_COOKIE } from "./auth/session";

await ping();
console.log("connected to postgres");
await runMigrations();
console.log("migrations up to date");

const app = new Elysia({
  cookie: {
    secrets: env.COOKIE_SECRET,
    sign: [SESSION_COOKIE],
  },
})
  .use(
    cors({
      origin: env.PUBLIC_WEB_URL,
      credentials: true,
    }),
  )
  .onError(({ code, error, set }) => {
    if (code === "VALIDATION") {
      set.status = 400;
      return { error: "validation_failed", message: error.message };
    }
    if (code === "NOT_FOUND") {
      set.status = 404;
      return { error: "not_found", message: "Not found" };
    }
    set.status = 500;
    console.error(error);
    return { error: "internal", message: "Internal server error" };
  })
  .use(healthRoutes)
  .use(authRoutes)
  .use(meRoutes)
  .use(writesRoutes)
  .use(analyticsRoutes)
  .use(questionsRoutes)
  .use(profilesRoutes)
  .use(tagsRoutes)
  .use(searchRoutes)
  .listen(env.PORT);

const scheduler = startAnalyticsScheduler();

console.log(`api listening on http://localhost:${env.PORT}`);

const shutdown = async () => {
  console.log("shutting down");
  scheduler.stop();
  await app.stop();
  await sql.end({ timeout: 5 });
  process.exit(0);
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
