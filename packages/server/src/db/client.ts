import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import { env } from "../env";
import * as schema from "./schema";

export const sql = postgres(env.DATABASE_URL, {
  max: 10,
  idle_timeout: 30,
  connect_timeout: 10,
});

export const db = drizzle(sql, { schema });

export async function ping(): Promise<void> {
  await sql`select 1`;
}

export async function runMigrations(): Promise<void> {
  const migrator = postgres(env.DATABASE_URL, {
    max: 1,
    onnotice: () => {},
  });
  try {
    await migrate(drizzle(migrator), {
      migrationsFolder: new URL("../../drizzle", import.meta.url).pathname,
    });
  } finally {
    await migrator.end({ timeout: 5 });
  }
}
