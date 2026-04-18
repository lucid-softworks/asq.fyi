import { runMigrations, sql } from "../db/client";

await runMigrations();
console.log("migrations applied");
await sql.end({ timeout: 5 });
