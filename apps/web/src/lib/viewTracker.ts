import { useEffect } from "react";

// Fires at most once per mounted (subjectUri, session) pair. Keeping this at
// module scope (rather than component state) means rapid unmount/remount —
// e.g. strict-mode double-render, hot reload — won't emit duplicate events.
const sent = new Set<string>();

export type AnalyticsSubjectType = "question" | "profile" | "tag";

function sendBeacon(url: string, body: string): boolean {
  if (typeof navigator === "undefined") return false;
  try {
    const blob = new Blob([body], { type: "application/json" });
    return navigator.sendBeacon(url, blob);
  } catch {
    return false;
  }
}

export function trackView(
  subjectUri: string,
  subjectType: AnalyticsSubjectType,
): void {
  const key = `${subjectType}|${subjectUri}`;
  if (sent.has(key)) return;
  sent.add(key);

  const url = "/api/analytics/view";
  const body = JSON.stringify({ subjectUri, subjectType });

  if (sendBeacon(url, body)) return;

  void fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body,
    credentials: "omit",
    keepalive: true,
  }).catch(() => {
    // swallow; analytics must never affect the read path
  });
}

export function trackShare(
  subjectUri: string,
  subjectType: AnalyticsSubjectType,
): void {
  const url = "/api/analytics/share";
  const body = JSON.stringify({ subjectUri, subjectType });

  if (sendBeacon(url, body)) return;
  void fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body,
    credentials: "omit",
    keepalive: true,
  }).catch(() => {
    /* swallow */
  });
}

/** Fires trackView once per session for the given subject. */
export function useViewTracker(
  subjectUri: string | null | undefined,
  subjectType: AnalyticsSubjectType,
): void {
  useEffect(() => {
    if (!subjectUri) return;
    trackView(subjectUri, subjectType);
  }, [subjectUri, subjectType]);
}
