import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { exportPKCS8, generateKeyPair } from "jose";
import { JoseKey } from "@atproto/oauth-client-node";
import { env } from "../env";

const DEV_KEY_FILE = new URL("../../.dev-oauth-key.pem", import.meta.url)
  .pathname;

function pemFromEnv(raw: string | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  return trimmed.replace(/\\n/g, "\n");
}

async function readFromFile(): Promise<string | null> {
  if (!existsSync(DEV_KEY_FILE)) return null;
  return readFileSync(DEV_KEY_FILE, "utf8");
}

async function generateDevKey(): Promise<string> {
  const { privateKey } = await generateKeyPair("ES256", { extractable: true });
  const pem = await exportPKCS8(privateKey);
  writeFileSync(DEV_KEY_FILE, pem, { mode: 0o600 });
  console.warn(
    `[oauth] generated ephemeral ES256 key → ${DEV_KEY_FILE}\n` +
      "        set OAUTH_PRIVATE_KEY_1 in .env for stable keys across resets.",
  );
  return pem;
}

export async function loadOAuthKey(): Promise<JoseKey> {
  let pem = pemFromEnv(env.OAUTH_PRIVATE_KEY_1);
  if (!pem) pem = await readFromFile();
  if (!pem) {
    if (env.NODE_ENV !== "development") {
      throw new Error(
        "OAUTH_PRIVATE_KEY_1 is required in non-development environments",
      );
    }
    pem = await generateDevKey();
  }
  return JoseKey.fromPKCS8(pem, "ES256", "asq-oauth-1");
}
