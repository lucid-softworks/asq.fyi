import { formatDistanceToNowStrict } from "date-fns";

export function relativeTime(iso: string): string {
  try {
    return formatDistanceToNowStrict(new Date(iso), { addSuffix: true });
  } catch {
    return iso;
  }
}

export function compactNumber(n: number): string {
  if (n < 1_000) return String(n);
  if (n < 1_000_000) return `${(n / 1_000).toFixed(n < 10_000 ? 1 : 0)}k`;
  return `${(n / 1_000_000).toFixed(n < 10_000_000 ? 1 : 0)}m`;
}

export function handleLabel(
  handle: string | null,
  did: string,
  fallback = "unknown",
): string {
  if (handle) return `@${handle}`;
  if (did) return did.slice(0, 12) + "…";
  return fallback;
}
