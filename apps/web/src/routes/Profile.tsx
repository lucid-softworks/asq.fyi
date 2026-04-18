import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { api, ApiRequestError } from "../lib/api";
import { Avatar } from "../components/Avatar";
import { ErrorState } from "../components/ErrorState";
import { Skeleton } from "../components/Skeleton";
import { questionHref } from "../lib/atUri";
import { compactNumber, relativeTime } from "../lib/format";
import { useMeta } from "../lib/meta";

export default function Profile() {
  const { handle = "" } = useParams();
  const q = useQuery({
    queryKey: ["profile", handle],
    queryFn: () => api.getProfile(handle),
    retry: (count, err) =>
      err instanceof ApiRequestError && err.status === 404 ? false : count < 2,
  });
  useMeta({
    title: q.data
      ? `${q.data.profile.displayName || "@" + (q.data.profile.handle ?? "")} — asq.fyi`
      : `@${handle} — asq.fyi`,
  });

  if (q.isLoading) {
    return (
      <div className="wrap-1100" style={{ padding: "var(--s-6) var(--s-5)" }}>
        <Skeleton width="40%" height={40} />
        <div style={{ height: 16 }} />
        <Skeleton width="100%" height={80} />
      </div>
    );
  }

  if (q.isError) {
    const notFound =
      q.error instanceof ApiRequestError && q.error.status === 404;
    return (
      <div className="wrap-980" style={{ padding: "var(--s-6) var(--s-5)" }}>
        {notFound ? (
          <ErrorState
            title="We don't know that person yet."
            message={`No questions or answers from @${handle} have been indexed on asq.fyi.`}
          />
        ) : (
          <ErrorState
            message={q.error instanceof Error ? q.error.message : undefined}
          />
        )}
      </div>
    );
  }

  const view = q.data!;
  const { profile, recentQuestions, recentAnswers } = view;

  return (
    <>
      <div className="crumbs">
        <div className="wrap-1240 crumbs__row">
          <Link to="/">FEED</Link>
          <span className="sep">/</span>
          <span>PROFILE</span>
          <span className="id">
            {profile.handle ? `@${profile.handle.toUpperCase()}` : profile.did}
          </span>
        </div>
      </div>

      <div
        className="wrap-1100"
        style={{ padding: "var(--s-6) var(--s-5) var(--s-8)" }}
      >
        <header
          className="card card--shadow"
          style={{
            display: "grid",
            gridTemplateColumns: "auto 1fr auto",
            gap: "var(--s-4)",
            alignItems: "center",
            padding: "var(--s-5)",
            marginBottom: "var(--s-6)",
          }}
        >
          <Avatar author={profile} size="lg" />
          <div>
            <h1
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "var(--t-3xl)",
                margin: 0,
                fontWeight: 400,
                lineHeight: 1,
              }}
            >
              {profile.displayName || profile.handle || "Unknown"}
            </h1>
            <p
              className="mono"
              style={{
                color: "var(--ink-3)",
                margin: "4px 0 0",
              }}
            >
              {profile.handle ? `@${profile.handle}` : profile.did}
            </p>
          </div>
          {profile.handle ? (
            <a
              href={`https://bsky.app/profile/${profile.handle}`}
              target="_blank"
              rel="noreferrer"
              className="btn btn--xs btn--ghost"
            >
              ON BSKY →
            </a>
          ) : null}
        </header>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "var(--s-6)",
          }}
          className="profile-grid"
        >
          <section>
            <h2
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "var(--t-2xl)",
                margin: "0 0 var(--s-3)",
                fontWeight: 400,
                borderBottom: "var(--bd)",
                paddingBottom: 6,
              }}
            >
              Recent questions
            </h2>
            {recentQuestions.length === 0 ? (
              <p className="serif" style={{ color: "var(--ink-3)" }}>
                No questions yet.
              </p>
            ) : (
              <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                {recentQuestions.map((qq) => (
                  <li
                    key={qq.uri}
                    style={{
                      padding: "var(--s-3) 0",
                      borderBottom: "1px dotted var(--paper-3)",
                    }}
                  >
                    <Link
                      to={questionHref(qq.uri)}
                      className="serif"
                      style={{
                        color: "var(--ink)",
                        fontWeight: 600,
                        fontSize: "var(--t-md)",
                        border: 0,
                        lineHeight: 1.3,
                      }}
                    >
                      {qq.title}
                    </Link>
                    <p
                      className="mono"
                      style={{
                        color: "var(--ink-3)",
                        margin: "4px 0 0",
                        fontSize: 11,
                      }}
                    >
                      {compactNumber(qq.score)} score ·{" "}
                      {compactNumber(qq.answerCount)}{" "}
                      {qq.answerCount === 1 ? "answer" : "answers"} ·{" "}
                      {relativeTime(qq.createdAt)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section>
            <h2
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "var(--t-2xl)",
                margin: "0 0 var(--s-3)",
                fontWeight: 400,
                borderBottom: "var(--bd)",
                paddingBottom: 6,
              }}
            >
              Recent answers
            </h2>
            {recentAnswers.length === 0 ? (
              <p className="serif" style={{ color: "var(--ink-3)" }}>
                No answers yet.
              </p>
            ) : (
              <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                {recentAnswers.map((a) => (
                  <li
                    key={a.uri}
                    style={{
                      padding: "var(--s-3) 0",
                      borderBottom: "1px dotted var(--paper-3)",
                    }}
                  >
                    <Link
                      to={questionHref(a.questionUri)}
                      className="mono"
                      style={{
                        fontSize: 11,
                        color: "var(--red)",
                        border: 0,
                        textTransform: "uppercase",
                        letterSpacing: "0.08em",
                      }}
                    >
                      ANSWERED →
                    </Link>
                    <p
                      className="serif"
                      style={{
                        color: "var(--ink)",
                        margin: "4px 0",
                        fontSize: "var(--t-sm)",
                        lineHeight: 1.5,
                        display: "-webkit-box",
                        WebkitLineClamp: 3,
                        WebkitBoxOrient: "vertical",
                        overflow: "hidden",
                      }}
                    >
                      {a.body}
                    </p>
                    <p
                      className="mono"
                      style={{
                        color: "var(--ink-3)",
                        margin: 0,
                        fontSize: 11,
                      }}
                    >
                      {compactNumber(a.score)} score ·{" "}
                      {relativeTime(a.createdAt)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <style>{`
          @media (max-width: 720px) {
            .profile-grid { grid-template-columns: 1fr !important; }
          }
        `}</style>
      </div>
    </>
  );
}
