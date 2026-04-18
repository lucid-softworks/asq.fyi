import { useState } from "react";
import { Avatar } from "./Avatar";
import { relativeTime } from "../lib/format";
import type { CommentDetail } from "../lib/types";

export function CommentThread({
  comments,
  initiallyExpanded = false,
}: {
  comments: CommentDetail[];
  initiallyExpanded?: boolean;
}) {
  const topLevel = comments.filter((c) => !c.parentUri);
  const byParent = new Map<string, CommentDetail[]>();
  for (const c of comments) {
    if (!c.parentUri) continue;
    const arr = byParent.get(c.parentUri) ?? [];
    arr.push(c);
    byParent.set(c.parentUri, arr);
  }

  const [expanded, setExpanded] = useState(
    initiallyExpanded || topLevel.length <= 2,
  );

  if (comments.length === 0) return null;
  const visible = expanded ? topLevel : topLevel.slice(0, 2);

  return (
    <div className="replies">
      {visible.map((c) => (
        <CommentItem key={c.uri} comment={c} replies={byParent.get(c.uri)} />
      ))}
      {!expanded && topLevel.length > 2 ? (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="mono"
          style={{
            background: "transparent",
            border: 0,
            color: "var(--red)",
            cursor: "pointer",
            fontSize: "var(--t-xs)",
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            padding: 0,
            textAlign: "left",
          }}
        >
          + show {topLevel.length - 2} more{" "}
          {topLevel.length - 2 === 1 ? "comment" : "comments"}
        </button>
      ) : null}
    </div>
  );
}

function CommentItem({
  comment,
  replies,
}: {
  comment: CommentDetail;
  replies?: CommentDetail[];
}) {
  const displayName =
    comment.author.displayName || comment.author.handle || "unknown";
  return (
    <>
      <div className="reply">
        <Avatar author={comment.author} size="sm" />
        <div>
          <div className="reply__head">
            <span className="name">{displayName}</span>
            <span className="when">
              {relativeTime(comment.createdAt).toUpperCase()}
            </span>
          </div>
          <p className="reply__body">{comment.body}</p>
        </div>
      </div>
      {replies && replies.length > 0
        ? replies.map((r) => (
            <div
              key={r.uri}
              className="reply"
              style={{ marginLeft: "var(--s-4)" }}
            >
              <Avatar author={r.author} size="sm" />
              <div>
                <div className="reply__head">
                  <span className="name">
                    {r.author.displayName || r.author.handle || "unknown"}
                  </span>
                  <span className="when">
                    {relativeTime(r.createdAt).toUpperCase()}
                  </span>
                </div>
                <p className="reply__body">{r.body}</p>
              </div>
            </div>
          ))
        : null}
    </>
  );
}
