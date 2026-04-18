import { z } from "zod";

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z.string().url(),
  PUBLIC_API_URL: z.string().url(),
  PUBLIC_WEB_URL: z.string().url(),
  COOKIE_SECRET: z.string().min(32),
  OAUTH_PRIVATE_KEY_1: z.string().optional(),
  JETSTREAM_URL: z.string().url().default("wss://jetstream2.us-east.bsky.network/subscribe"),
});

export type Env = z.infer<typeof schema>;

function load(): Env {
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    console.error("Invalid environment:");
    for (const issue of parsed.error.issues) {
      console.error(`  ${issue.path.join(".")}: ${issue.message}`);
    }
    process.exit(1);
  }
  return parsed.data;
}

export const env = load();
