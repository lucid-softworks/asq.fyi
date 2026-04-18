import { Link } from "@tanstack/react-router";
import { Avatar } from "./Avatar";
import type { ProfileSummary } from "../lib/types";

export function AuthorLink({
  author,
  size = "sm",
}: {
  author: ProfileSummary;
  size?: "sm" | "md";
}) {
  const label =
    author.displayName ||
    (author.handle ? author.handle : author.did.slice(0, 14) + "…");
  const at = author.handle
    ? `@${author.handle}`
    : author.did.slice(0, 20) + "…";
  const body = (
    <>
      <Avatar author={author} size={size === "sm" ? "sm" : "md"} />
      <span>
        <span className="name">{label}</span>
        <br />
        <span className="at">{at}</span>
      </span>
    </>
  );
  if (author.handle) {
    return (
      <Link
        to="/u/$handle"
        params={{ handle: author.handle }}
        className="handle"
      >
        {body}
      </Link>
    );
  }
  return <span className="handle">{body}</span>;
}
