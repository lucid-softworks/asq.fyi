export interface AtUri {
  did: string;
  collection: string;
  rkey: string;
}

export function parseAtUri(uri: string): AtUri | null {
  const m = uri.match(/^at:\/\/([^/]+)\/([^/]+)\/([^/]+)$/);
  if (!m) return null;
  return { did: m[1]!, collection: m[2]!, rkey: m[3]! };
}

export function questionUri(did: string, rkey: string): string {
  return `at://${did}/fyi.asq.question/${rkey}`;
}

export function questionHref(uri: string): string {
  const parsed = parseAtUri(uri);
  if (!parsed) return "/";
  return `/q/${parsed.did}/${parsed.rkey}`;
}
