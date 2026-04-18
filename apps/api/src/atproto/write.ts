import { Agent } from "@atproto/api";
import type { OAuthSession } from "@atproto/oauth-client-node";
import { parseAtUri } from "./uri";

export interface StrongRef {
  uri: string;
  cid: string;
}

export interface CreateRecordResult {
  uri: string;
  cid: string;
}

export class PdsWriteError extends Error {
  constructor(
    message: string,
    public override cause?: unknown,
  ) {
    super(message);
    this.name = "PdsWriteError";
  }
}

function agentFor(session: OAuthSession): Agent {
  return new Agent(session);
}

export async function createRecord<T extends Record<string, unknown>>(
  session: OAuthSession,
  collection: string,
  record: T,
): Promise<CreateRecordResult> {
  try {
    const res = await agentFor(session).com.atproto.repo.createRecord({
      repo: session.did,
      collection,
      record: { $type: collection, ...record },
    });
    return { uri: res.data.uri, cid: res.data.cid };
  } catch (err) {
    throw new PdsWriteError(
      err instanceof Error ? err.message : "PDS createRecord failed",
      err,
    );
  }
}

export async function deleteRecord(
  session: OAuthSession,
  uri: string,
): Promise<void> {
  const parsed = parseAtUri(uri);
  if (!parsed) throw new PdsWriteError(`invalid AT URI: ${uri}`);
  if (parsed.did !== session.did) {
    throw new PdsWriteError(
      "record belongs to a different DID; cannot delete",
    );
  }
  try {
    await agentFor(session).com.atproto.repo.deleteRecord({
      repo: session.did,
      collection: parsed.collection,
      rkey: parsed.rkey,
    });
  } catch (err) {
    throw new PdsWriteError(
      err instanceof Error ? err.message : "PDS deleteRecord failed",
      err,
    );
  }
}
