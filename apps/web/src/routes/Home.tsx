import { useQuery } from "@tanstack/react-query";
import { Link, useSearchParams } from "react-router-dom";
import { useState } from "react";
import { api, type QuestionSort } from "../lib/api";
import { QuestionCard } from "../components/QuestionCard";
import { QuestionListSkeleton } from "../components/Skeleton";
import { EmptyState } from "../components/EmptyState";
import { ErrorState } from "../components/ErrorState";
import { Tabs, type TabDef } from "../components/Tabs";
import { TagBadge } from "../components/TagBadge";
import { useSession } from "../lib/session";
import { questionHref } from "../lib/atUri";

const tabs: TabDef<QuestionSort>[] = [
  { value: "new", label: "★ NEW" },
  { value: "top", label: "TOP" },
  { value: "unanswered", label: "UNANSWERED" },
  { value: "trending", label: "TRENDING" },
  { value: "most_viewed", label: "MOST VIEWED" },
  { value: "most_discussed", label: "MOST DISCUSSED" },
];

const emptyCopy: Record<QuestionSort, { title: string; body: string }> = {
  new: { title: "No questions yet.", body: "Be the first to ask something." },
  top: {
    title: "Nothing has been voted on yet.",
    body: "Come back once the community has weighed in.",
  },
  unanswered: {
    title: "Every question has an answer.",
    body: "Nothing is unanswered right now.",
  },
  trending: { title: "Nothing trending yet.", body: "Try another tab." },
  most_viewed: {
    title: "No views to count yet.",
    body: "Once questions get traffic you'll see them here.",
  },
  most_discussed: {
    title: "No discussions yet.",
    body: "Once people reply and comment, conversations show up here.",
  },
};

export default function Home() {
  const [params, setParams] = useSearchParams();
  const session = useSession();
  const sort = ((tabs.map((t) => t.value) as string[]).includes(
    params.get("sort") ?? "",
  )
    ? params.get("sort")
    : "new") as QuestionSort;

  const [tagSort, setTagSort] = useState<"popular" | "trending">("popular");

  const feedQueryKey =
    sort === "trending"
      ? (["trending", { window: "7d" }] as const)
      : (["questions", { sort }] as const);

  const questionsQ = useQuery({
    queryKey: feedQueryKey,
    queryFn: () =>
      sort === "trending"
        ? api.listTrending({ window: "7d", limit: 20 })
        : api.listQuestions({ sort, limit: 20 }),
  });
  const tagsQ = useQuery({
    queryKey: ["tags", { sort: tagSort }],
    queryFn: () => api.listTags({ sort: tagSort, limit: 20 }),
  });

  const onTab = (value: QuestionSort) => {
    const next = new URLSearchParams(params);
    if (value === "new") next.delete("sort");
    else next.set("sort", value);
    setParams(next, { replace: true });
  };

  return (
    <>
      <section className="hero">
        <div className="wrap-1240">
          <div className="hero__grid">
            <div>
              <div className="hero__eyebrow">
                <span className="pill">★ NOW IN OPEN BETA</span>
                <span>EST. 2026 &middot; ON THE AT PROTOCOL</span>
              </div>
              <h1>
                ask anyone
                <span className="lf">
                  anything<span className="qmark">?</span>
                </span>
                <span className="small">— and get a real answer back.</span>
              </h1>
              <p className="hero__lede">
                A public square for questions both <b>silly and serious</b>.
                Built on the same open network as Bluesky, so your account,
                your followers, and your answers belong to <b>you</b> — not
                us.
              </p>
              <div className="hero__cta">
                <Link to="/ask" className="btn btn--primary">
                  ★ ASK YOUR FIRST Q
                </Link>
                {session.data ? null : (
                  <Link to="/login" className="btn btn--ghost">
                    SIGN IN WITH BLUESKY →
                  </Link>
                )}
              </div>
              <div className="hero__fineprint">
                <span className="ok">●</span> no algorithm, no ads, no funny
                business
              </div>
            </div>

            <aside>
              <HeroSideQuestion />
            </aside>
          </div>
        </div>
      </section>

      <section className="section" id="feed">
        <div className="wrap-1240">
          <div className="section__head">
            <div>
              <div className="section__num">§ 01 / FRESH OFF THE PRESS</div>
              <h2 className="section__title">live on the wire, right now</h2>
            </div>
            <p className="section__sub">
              A real, unfiltered slice of what people are asking each other.
              No algorithm — just the feed, the way grandma intended.
            </p>
          </div>

          <div className="home-grid">
            <div>
              <Tabs
                tabs={tabs}
                value={sort}
                onChange={onTab}
                label="Sort"
                trailing={questionsQ.isFetching ? "updating…" : undefined}
              />

              {questionsQ.isLoading ? (
                <QuestionListSkeleton />
              ) : questionsQ.isError ? (
                <ErrorState
                  message={
                    questionsQ.error instanceof Error
                      ? questionsQ.error.message
                      : undefined
                  }
                />
              ) : !questionsQ.data || questionsQ.data.items.length === 0 ? (
                <EmptyState
                  title={emptyCopy[sort].title}
                  body={emptyCopy[sort].body}
                  action={
                    <Link to="/ask" className="btn btn--primary btn--sm">
                      ★ ASK SOMETHING
                    </Link>
                  }
                />
              ) : (
                <div className="feed">
                  {questionsQ.data.items.map((q) => (
                    <QuestionCard
                      key={q.uri}
                      question={q}
                      feedQueryKey={feedQueryKey}
                    />
                  ))}
                </div>
              )}
            </div>

            <aside className="side-card" style={{ alignSelf: "start" }}>
              <h4>
                <span>Topics</span>
                <span style={{ display: "inline-flex", gap: 6 }}>
                  <button
                    type="button"
                    onClick={() => setTagSort("popular")}
                    aria-pressed={tagSort === "popular"}
                    className="mono"
                    style={{
                      background: "transparent",
                      border: 0,
                      cursor: "pointer",
                      padding: 0,
                      fontSize: 10,
                      letterSpacing: "0.08em",
                      color:
                        tagSort === "popular" ? "var(--red)" : "var(--ink-3)",
                    }}
                  >
                    POP
                  </button>
                  <span style={{ color: "var(--ink-faint)" }}>·</span>
                  <button
                    type="button"
                    onClick={() => setTagSort("trending")}
                    aria-pressed={tagSort === "trending"}
                    className="mono"
                    style={{
                      background: "transparent",
                      border: 0,
                      cursor: "pointer",
                      padding: 0,
                      fontSize: 10,
                      letterSpacing: "0.08em",
                      color:
                        tagSort === "trending"
                          ? "var(--red)"
                          : "var(--ink-3)",
                    }}
                  >
                    TRENDING
                  </button>
                </span>
              </h4>
              {tagsQ.isLoading ? (
                <div className="chip-wrap">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <span
                      key={i}
                      className="skel"
                      style={{ width: 60, height: 20 }}
                    />
                  ))}
                </div>
              ) : !tagsQ.data || tagsQ.data.items.length === 0 ? (
                <p
                  className="serif"
                  style={{
                    fontSize: "var(--t-sm)",
                    color: "var(--ink-3)",
                    margin: 0,
                  }}
                >
                  {tagSort === "trending"
                    ? "Nothing trending right now."
                    : "Tags appear once questions are posted."}
                </p>
              ) : (
                <div className="chip-wrap">
                  {tagsQ.data.items.map((t) => (
                    <TagBadge key={t.tag} tag={t.tag} />
                  ))}
                </div>
              )}
            </aside>
          </div>
        </div>
      </section>

      <section
        className="section"
        id="how"
        style={{ background: "var(--paper-2)" }}
      >
        <div className="wrap-1240">
          <div className="section__head">
            <div>
              <div className="section__num">§ 02 / HOW IT WORKS</div>
              <h2 className="section__title">the whole thing, in three</h2>
            </div>
            <p className="section__sub">
              If you've used the internet, you'll get it. Bring the Q, the
              crowd brings the A.
            </p>
          </div>
          <HowItWorks />
        </div>
      </section>

      <style>{`
        .home-grid { display: grid; grid-template-columns: minmax(0, 1fr) 280px; gap: var(--s-5); }
        @media (max-width: 900px) { .home-grid { grid-template-columns: 1fr; } }
      `}</style>
    </>
  );
}

function HeroSideQuestion() {
  const q = useQuery({
    queryKey: ["hero-top"],
    queryFn: () => api.listQuestions({ sort: "top", limit: 1 }),
    staleTime: 60_000,
  });
  const item = q.data?.items[0];

  if (!item) {
    return (
      <article
        className="card card--shadow"
        style={{ position: "relative", padding: "var(--s-5)" }}
      >
        <div
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "var(--t-xs)",
            color: "var(--ink-3)",
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            borderBottom: "var(--bd-dotted)",
            paddingBottom: 8,
            marginBottom: "var(--s-3)",
          }}
        >
          NO QUESTIONS YET · BE THE FIRST
        </div>
        <h3
          style={{
            fontFamily: "var(--font-serif)",
            fontSize: "var(--t-xl)",
            fontWeight: 600,
            margin: 0,
            lineHeight: 1.25,
          }}
        >
          your question goes here.
        </h3>
        <p
          style={{
            marginTop: "var(--s-3)",
            marginBottom: 0,
            color: "var(--ink-2)",
          }}
        >
          Silly or serious, technical or emotional. Someone on the network is
          waiting to answer.
        </p>
      </article>
    );
  }

  return (
    <article
      className="card card--shadow"
      style={{ position: "relative", padding: "var(--s-5)" }}
    >
      <div
        style={{
          position: "absolute",
          top: -16,
          right: -8,
          transform: "rotate(6deg)",
          background: "var(--mustard)",
          border: "var(--bd-thin)",
          padding: "6px 14px 4px",
          fontFamily: "var(--font-display)",
          fontSize: "var(--t-lg)",
          zIndex: 2,
        }}
      >
        FEATURED Q
      </div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          borderBottom: "var(--bd-dotted)",
          paddingBottom: 8,
          marginBottom: "var(--s-3)",
          fontFamily: "var(--font-mono)",
          fontSize: "var(--t-xs)",
          color: "var(--ink-3)",
          textTransform: "uppercase",
          letterSpacing: "0.08em",
        }}
      >
        <span>TOP OF ALL TIME</span>
        <span>
          {item.answerCount} ans · {item.score >= 0 ? "+" : ""}
          {item.score} votes
        </span>
      </div>
      <h3
        style={{
          fontFamily: "var(--font-serif)",
          fontSize: "var(--t-xl)",
          fontWeight: 600,
          margin: 0,
          lineHeight: 1.25,
        }}
      >
        <Link
          to={questionHref(item.uri)}
          style={{ color: "var(--ink)", border: 0 }}
        >
          {item.title}
        </Link>
      </h3>
      {item.tags.length > 0 ? (
        <div
          className="row gap-2 wrap"
          style={{ marginTop: 12, marginBottom: 0 }}
        >
          {item.tags.slice(0, 3).map((t) => (
            <TagBadge key={t} tag={t} />
          ))}
        </div>
      ) : null}
    </article>
  );
}

function HowItWorks() {
  return (
    <div className="how-grid3">
      <Step
        num="1"
        glyph={`┌─────────────┐
│  ?          │
│             │
└─────────────┘
   YOUR Q`}
        title="ASK"
        body="Type your question, add a tag or two, hit post. It goes to your atproto repo — yours to keep and portable anywhere."
      />
      <Step
        num="2"
        glyph={`  ▲   ▲   ▲
  │   │   │
┌─┴───┴───┴─┐
│  A  A  A  │
└───────────┘
   THE CROWD`}
        title="ANSWER"
        body="People who know (or have opinions) reply. Everyone votes. Best answer rises — you can mark one as accepted."
      />
      <Step
        num="3"
        glyph={`       ★
      ╱│╲
     ╱ │ ╲
   ┌───────┐
   │  Q→A  │
   └───────┘
   THE TRUTH`}
        title="ARCHIVE"
        body="The whole thread is portable, indexable, and yours forever. Quote it. Embed it. Move it to another app."
      />
      <style>{`
        .how-grid3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--s-5); }
        @media (max-width: 720px) { .how-grid3 { grid-template-columns: 1fr; } }
      `}</style>
    </div>
  );
}

function Step({
  num,
  glyph,
  title,
  body,
}: {
  num: string;
  glyph: string;
  title: string;
  body: string;
}) {
  return (
    <div
      style={{
        border: "var(--bd)",
        background: "var(--card)",
        padding: "var(--s-5)",
        position: "relative",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: -18,
          left: -10,
          background: "var(--ink)",
          color: "var(--paper)",
          fontFamily: "var(--font-display)",
          fontSize: "var(--t-2xl)",
          width: 48,
          height: 48,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          lineHeight: 1,
          transform: "rotate(-4deg)",
        }}
      >
        {num}
      </div>
      <pre
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: "var(--t-xs)",
          color: "var(--ink-3)",
          margin: "var(--s-3) 0",
          lineHeight: 1.4,
          textAlign: "center",
          borderBottom: "var(--bd-dotted)",
          paddingBottom: "var(--s-3)",
        }}
      >
        {glyph}
      </pre>
      <h4
        style={{
          fontFamily: "var(--font-display)",
          fontSize: "var(--t-2xl)",
          margin: "var(--s-3) 0 var(--s-2)",
          lineHeight: 1,
          fontWeight: 400,
        }}
      >
        {title}
      </h4>
      <p
        style={{
          fontFamily: "var(--font-serif)",
          fontSize: "var(--t-sm)",
          color: "var(--ink-2)",
          margin: 0,
          lineHeight: 1.5,
        }}
      >
        {body}
      </p>
    </div>
  );
}
