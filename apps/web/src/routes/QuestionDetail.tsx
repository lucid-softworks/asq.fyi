import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api, ApiRequestError } from "../lib/api";
import { questionUri } from "../lib/atUri";
import { compactNumber, relativeTime } from "../lib/format";
import type { QuestionDetail as QDetail } from "../lib/types";
import { AcceptAnswerButton } from "../components/AcceptAnswerButton";
import { AnswerComposer } from "../components/AnswerComposer";
import { CommentThread } from "../components/CommentThread";
import { CommentComposer } from "../components/CommentComposer";
import { Avatar } from "../components/Avatar";
import { DeleteButton } from "../components/DeleteButton";
import { ErrorState } from "../components/ErrorState";
import { Markdown } from "../components/Markdown";
import { TagBadge } from "../components/TagBadge";
import { VoteButtons } from "../components/VoteButtons";
import { ShareButton } from "../components/ShareButton";
import { Skeleton } from "../components/Skeleton";
import { useSession } from "../lib/session";
import { useViewTracker } from "../lib/viewTracker";
import { useMeta } from "../lib/meta";

export default function QuestionDetail() {
  const { did = "", rkey = "" } = useParams();
  const navigate = useNavigate();
  const uri = questionUri(did, rkey);
  const session = useSession();
  useViewTracker(uri, "question");
  const queryKey = ["question", uri] as const;
  const q = useQuery({
    queryKey,
    queryFn: () => api.getQuestion(uri),
    retry: (count, err) =>
      err instanceof ApiRequestError && err.status === 404 ? false : count < 2,
  });
  const detailData = q.data;
  useMeta({
    title: detailData ? `${detailData.title} — asq.fyi` : undefined,
    description: detailData
      ? detailData.body.slice(0, 200).replace(/\s+/g, " ").trim()
      : undefined,
  });

  if (q.isLoading) {
    return (
      <div className="wrap-1240" style={{ padding: "var(--s-6) var(--s-5)" }}>
        <Skeleton width="60%" height={32} />
        <div style={{ height: 12 }} />
        <Skeleton width="100%" />
        <div style={{ height: 6 }} />
        <Skeleton width="90%" />
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
            title="Question not found"
            message="It may have been deleted from the author's PDS, or never existed."
          />
        ) : (
          <ErrorState
            message={q.error instanceof Error ? q.error.message : undefined}
          />
        )}
      </div>
    );
  }

  const detail = q.data!;
  const isOwnQuestion = session.data?.did === detail.author.did;
  const rkeyPart = detail.uri.split("/").pop() ?? "";

  return (
    <>
      <div className="crumbs">
        <div className="wrap-1240 crumbs__row">
          <Link to="/">FEED</Link>
          {detail.tags.slice(0, 2).map((t) => (
            <span key={t}>
              <span className="sep">/</span>
              <Link to={`/tag/${encodeURIComponent(t)}`}>
                #{t.toUpperCase()}
              </Link>
            </span>
          ))}
          <span className="sep">/</span>
          <span>QUESTION</span>
          <span className="id">REC {rkeyPart.slice(0, 8)}…</span>
        </div>
      </div>

      <div className="qpage">
        <article>
          <div className="q-head">
            <div className="q-head__meta-top">
              {detail.acceptedAnswerUri ? (
                <span className="chip chip--mustard">★ ACCEPTED</span>
              ) : null}
              <span>
                {detail.answerCount}{" "}
                {detail.answerCount === 1 ? "ANSWER" : "ANSWERS"}
              </span>
              <span>· ASKED {relativeTime(detail.createdAt).toUpperCase()}</span>
              {detail.viewsTotal > 0 ? (
                <span>
                  · VIEWED {compactNumber(detail.viewsTotal).toUpperCase()}{" "}
                  TIMES
                </span>
              ) : null}
            </div>
            <h1 className="q-head__title">{detail.title}</h1>
            <div className="q-head__row">
              <div className="q-head__tags">
                {detail.tags.map((t) => (
                  <TagBadge key={t} tag={t} />
                ))}
              </div>
              <div className="q-head__actions">
                <ShareButton subjectUri={detail.uri} />
                {isOwnQuestion ? (
                  <>
                    <span className="pipe">·</span>
                    <DeleteButton
                      uri={detail.uri}
                      label="DELETE"
                      confirm="Delete this question? It'll be removed from your PDS."
                      onDeleted={() => navigate("/")}
                      invalidateKeys={[queryKey]}
                    />
                  </>
                ) : null}
              </div>
            </div>
          </div>

          <div className="asker-strip">
            <Avatar author={detail.author} size="lg" />
            <div>
              <p className="asker-strip__name">
                {detail.author.displayName ||
                  detail.author.handle ||
                  "Unknown"}
              </p>
              <span className="asker-strip__handle">
                {detail.author.handle
                  ? `@${detail.author.handle}`
                  : detail.author.did}
              </span>
            </div>
            <div className="asker-strip__when">
              <b>{relativeTime(detail.createdAt).toUpperCase()}</b>
              <span>
                {new Date(detail.createdAt).toLocaleString(undefined, {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
              </span>
            </div>
          </div>

          <div className="answer-row">
            <VoteButtons<QDetail>
              subjectUri={detail.uri}
              subjectCid={detail.cid}
              queryKey={queryKey}
              readFrom={(d) => ({ score: d.score, viewerVote: d.viewerVote })}
              writeTo={(d, patch) => ({ ...d, ...patch })}
              size="big"
              label="QUESTION SCORE"
            />
            <div className="q-body">
              <Markdown>{detail.body}</Markdown>
              {detail.comments.length > 0 ? (
                <CommentThread comments={detail.comments} />
              ) : null}
              {session.data ? (
                <div style={{ marginTop: "var(--s-3)" }}>
                  <CommentComposer
                    subjectUri={detail.uri}
                    subjectCid={detail.cid}
                    questionUri={detail.uri}
                  />
                </div>
              ) : null}
            </div>
          </div>

          <div className="answers-head" style={{ marginTop: "var(--s-7)" }}>
            <h2>
              <span className="count">{detail.answerCount}</span>
              {detail.answerCount === 1 ? "answer" : "answers"}
            </h2>
          </div>

          {detail.answers.length === 0 ? (
            <EmptyAnswer isOwnQuestion={isOwnQuestion} />
          ) : (
            <div className="answers-list">
              {detail.answers.map((a, idx) => {
                const isOwnAnswer = session.data?.did === a.author.did;
                return (
                  <div key={a.uri} className="answer-row">
                    <VoteButtons<QDetail>
                      subjectUri={a.uri}
                      subjectCid={a.cid}
                      queryKey={queryKey}
                      readFrom={(d) => {
                        const t = d.answers[idx];
                        return t
                          ? { score: t.score, viewerVote: t.viewerVote }
                          : null;
                      }}
                      writeTo={(d, patch) => ({
                        ...d,
                        answers: d.answers.map((x, i) =>
                          i === idx ? { ...x, ...patch } : x,
                        ),
                      })}
                      size="big"
                      label={a.isAccepted ? "ACCEPTED" : "VOTES"}
                    />
                    <article
                      className={`a-card${a.isAccepted ? " a-card--accepted" : ""}`}
                    >
                      {a.isAccepted ? (
                        <div className="a-card__stamp">★ ACCEPTED</div>
                      ) : null}
                      <div className="a-card__head">
                        <Link
                          to={
                            a.author.handle
                              ? `/u/${encodeURIComponent(a.author.handle)}`
                              : "#"
                          }
                          className="handle"
                        >
                          <Avatar author={a.author} />
                          <span>
                            <span className="name">
                              {a.author.displayName ||
                                a.author.handle ||
                                "unknown"}
                            </span>
                            <br />
                            <span className="at">
                              {a.author.handle
                                ? `@${a.author.handle}`
                                : a.author.did.slice(0, 16) + "…"}
                            </span>
                          </span>
                        </Link>
                        {isOwnQuestion ? (
                          <AcceptAnswerButton
                            questionUri={detail.uri}
                            answerUri={a.uri}
                            answerCid={a.cid}
                            isAccepted={a.isAccepted}
                          />
                        ) : null}
                      </div>
                      <div className="a-card__body">
                        <Markdown>{a.body}</Markdown>
                      </div>
                      <div className="a-card__foot">
                        <span className="mono" style={{ color: "var(--ink-3)" }}>
                          posted {relativeTime(a.createdAt)}
                        </span>
                        <div className="a-card__actions">
                          {isOwnAnswer ? (
                            <DeleteButton
                              uri={a.uri}
                              label="DELETE"
                              confirm="Delete this answer? It'll be removed from your PDS."
                              invalidateKeys={[queryKey]}
                            />
                          ) : null}
                        </div>
                      </div>
                      <CommentThread comments={a.comments} />
                      {session.data ? (
                        <div style={{ marginTop: "var(--s-3)" }}>
                          <CommentComposer
                            subjectUri={a.uri}
                            subjectCid={a.cid}
                            questionUri={detail.uri}
                          />
                        </div>
                      ) : null}
                    </article>
                  </div>
                );
              })}
            </div>
          )}

          {session.data ? (
            <AnswerComposer questionUri={detail.uri} />
          ) : (
            <div className="composer" style={{ textAlign: "center" }}>
              <p style={{ margin: 0 }}>
                <Link
                  to={`/login?next=${encodeURIComponent(`/q/${did}/${rkey}`)}`}
                >
                  Sign in
                </Link>{" "}
                to post an answer.
              </p>
            </div>
          )}
        </article>

        <aside>
          <div className="side-card">
            <h4>
              <span>Topics</span>
            </h4>
            {detail.tags.length === 0 ? (
              <p
                className="serif"
                style={{
                  fontSize: "var(--t-sm)",
                  color: "var(--ink-3)",
                  margin: 0,
                }}
              >
                No tags on this question.
              </p>
            ) : (
              <div className="chip-wrap">
                {detail.tags.map((t) => (
                  <TagBadge key={t} tag={t} />
                ))}
              </div>
            )}
          </div>
          <div className="side-card">
            <h4>
              <span>On the protocol</span>
            </h4>
            <ul>
              <li>
                <a
                  href={`https://pdsls.dev/at/${detail.author.did}/fyi.asq.question/${rkeyPart}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  Inspect this record
                  <span className="sub">pdsls.dev</span>
                </a>
              </li>
              <li>
                <a
                  href={
                    detail.author.handle
                      ? `https://bsky.app/profile/${detail.author.handle}`
                      : `https://bsky.app/profile/${detail.author.did}`
                  }
                  target="_blank"
                  rel="noreferrer"
                >
                  Author on bsky
                  <span className="sub">bsky.app</span>
                </a>
              </li>
            </ul>
          </div>
        </aside>
      </div>
    </>
  );
}

function EmptyAnswer({ isOwnQuestion }: { isOwnQuestion: boolean }) {
  return (
    <div className="empty" style={{ marginBottom: "var(--s-5)" }}>
      <div className="ascii">{`   ▲    ▲    ▲
   ·    ·    ·
 no answers yet`}</div>
      <h4>No answers yet.</h4>
      <p>
        {isOwnQuestion
          ? "Hang tight — someone on the network should be along."
          : "Be the first to answer. Someone else will thank you."}
      </p>
    </div>
  );
}
