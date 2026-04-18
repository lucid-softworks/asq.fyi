import { NodeOAuthClient, requestLocalLock } from "@atproto/oauth-client-node";
import { env } from "../env";
import { loadOAuthKey } from "./keys";
import { sessionStore, stateStore } from "./stores";

const SCOPE = "atproto transition:generic";

/**
 * In production (HTTPS) we act as a confidential web client with
 * private_key_jwt + a publicly-reachable /client-metadata.json + /jwks.json.
 *
 * In dev over HTTP, ATProto OAuth requires the "loopback" client pattern:
 * client_id is the literal "http://localhost" URL with the redirect_uri in a
 * query param, and auth is public (no client secret). Redirect URIs must be
 * loopback IPs (127.0.0.1 / [::1]), not "localhost".
 */
function isLoopbackDev(): boolean {
  return env.PUBLIC_API_URL.startsWith("http://");
}

function loopbackClientId(): string {
  const redirect = `${env.PUBLIC_API_URL}/auth/callback`;
  const params = new URLSearchParams({
    redirect_uri: redirect,
    scope: SCOPE,
  });
  return `http://localhost?${params.toString()}`;
}

export async function createOAuthClient(): Promise<NodeOAuthClient> {
  if (isLoopbackDev()) {
    return new NodeOAuthClient({
      clientMetadata: {
        client_id: loopbackClientId(),
        client_name: "asq.fyi (dev)",
        // For the loopback client, client_uri is constrained to match the
        // loopback host on the client_id — keep it on http://localhost.
        client_uri: "http://localhost",
        redirect_uris: [`${env.PUBLIC_API_URL}/auth/callback`],
        scope: SCOPE,
        grant_types: ["authorization_code", "refresh_token"],
        response_types: ["code"],
        application_type: "web",
        token_endpoint_auth_method: "none",
        dpop_bound_access_tokens: true,
      },
      stateStore,
      sessionStore,
      requestLock: requestLocalLock,
      allowHttp: true,
    });
  }

  const key = await loadOAuthKey();
  return new NodeOAuthClient({
    clientMetadata: {
      client_id: `${env.PUBLIC_API_URL}/client-metadata.json`,
      client_name: "asq.fyi",
      // client_uri must share the same origin as client_id per the ATProto
      // OAuth spec. Keep it on the API host; the consent-screen link goes
      // there but PUBLIC_WEB_URL is still where the user ends up after the
      // /auth/callback redirect.
      client_uri: env.PUBLIC_API_URL,
      redirect_uris: [`${env.PUBLIC_API_URL}/auth/callback`],
      scope: SCOPE,
      grant_types: ["authorization_code", "refresh_token"],
      response_types: ["code"],
      application_type: "web",
      token_endpoint_auth_method: "private_key_jwt",
      token_endpoint_auth_signing_alg: "ES256",
      dpop_bound_access_tokens: true,
      jwks_uri: `${env.PUBLIC_API_URL}/jwks.json`,
    },
    keyset: [key],
    stateStore,
    sessionStore,
    requestLock: requestLocalLock,
  });
}

// Lazy singleton — creating the client does async work (loading the ES256
// key) and top-level await isn't available in the default SSR esbuild target.
let _client: Promise<NodeOAuthClient> | null = null;
export function oauthClient(): Promise<NodeOAuthClient> {
  if (!_client) _client = createOAuthClient();
  return _client;
}
