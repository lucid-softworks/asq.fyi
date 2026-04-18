import { useState } from "react";
import { trackShare } from "../lib/viewTracker";

export function ShareButton({ subjectUri }: { subjectUri: string }) {
  const [copied, setCopied] = useState(false);

  const onClick = async () => {
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(window.location.href);
      }
      setCopied(true);
      trackShare(subjectUri, "question");
      setTimeout(() => setCopied(false), 1800);
    } catch {
      trackShare(subjectUri, "question");
    }
  };

  return (
    <button type="button" onClick={onClick}>
      {copied ? "✓ COPIED" : "SHARE"}
    </button>
  );
}
