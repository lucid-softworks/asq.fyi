import type { ProfileSummary } from "../lib/types";

export function Avatar({
  author,
  size = "md",
}: {
  author: ProfileSummary;
  size?: "sm" | "md" | "lg";
}) {
  const cls =
    size === "sm" ? "avatar avatar--sm" : size === "lg" ? "avatar avatar--lg" : "avatar";
  const initial =
    (author.displayName || author.handle || author.did || "?")
      .replace(/^@/, "")
      .charAt(0)
      .toLowerCase();
  if (author.avatarUrl) {
    return (
      <span className={cls} aria-hidden>
        <img src={author.avatarUrl} alt="" loading="lazy" />
      </span>
    );
  }
  return (
    <span className={cls} aria-hidden>
      {initial}
    </span>
  );
}
