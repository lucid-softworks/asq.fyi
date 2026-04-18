import { Link } from "@tanstack/react-router";
import { parseAtUri } from "../lib/atUri";
import { compactNumber, relativeTime } from "../lib/format";
import type { QuestionCard as Q } from "../lib/types";
import { Avatar } from "./Avatar";
import { TagBadge } from "./TagBadge";

export function QuestionCard({
  question,
  feedQueryKey,
}: {
  question: Q;
  feedQueryKey?: readonly unknown[];
}) {
  void feedQueryKey;
  const parsed = parseAtUri(question.uri);
  const authorLabel = question.author.handle
    ? `@${question.author.handle}`
    : question.author.did.slice(0, 14) + "…";

  return (
    <article className="q-card">
      <div className="q-card__nums">
        <div className={question.acceptedAnswerUri ? "has-answer" : ""}>
          <b>{compactNumber(question.score)}</b>
          <span className="k">votes</span>
        </div>
        <div className={question.acceptedAnswerUri ? "has-answer" : ""}>
          <b>{compactNumber(question.answerCount)}</b>
          <span className="k">
            {question.acceptedAnswerUri ? "✓ ans" : "ans"}
          </span>
        </div>
        <div className="small">
          <b>{compactNumber(question.viewsTotal)}</b>
          <span className="k">views</span>
        </div>
      </div>
      <div>
        <h3 className="q-card__title">
          {parsed ? (
            <Link
              to="/q/$did/$rkey"
              params={{ did: parsed.did, rkey: parsed.rkey }}
            >
              {question.title}
            </Link>
          ) : (
            <span>{question.title}</span>
          )}
        </h3>
        <p className="q-card__body">{question.body}</p>
        {question.tags.length > 0 ? (
          <div className="q-card__meta">
            {question.tags.map((tag) => (
              <TagBadge key={tag} tag={tag} />
            ))}
          </div>
        ) : null}
      </div>
      <div className="q-card__when">
        <b>{relativeTime(question.createdAt)}</b>
        <span>by</span>
        <div
          className="row gap-2"
          style={{ marginTop: 4, justifyContent: "flex-end" }}
        >
          <Avatar author={question.author} size="sm" />
          <div style={{ textAlign: "left" }}>
            {question.author.handle ? (
              <Link
                to="/u/$handle"
                params={{ handle: question.author.handle }}
                style={{
                  fontFamily: "var(--font-serif)",
                  fontSize: "var(--t-xs)",
                  color: "var(--ink)",
                  fontWeight: 600,
                  border: 0,
                }}
              >
                {authorLabel}
              </Link>
            ) : (
              <span
                style={{
                  fontFamily: "var(--font-serif)",
                  fontSize: "var(--t-xs)",
                  color: "var(--ink)",
                  fontWeight: 600,
                }}
              >
                {authorLabel}
              </span>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}
