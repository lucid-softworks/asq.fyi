import { useQuery } from "@tanstack/react-query";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { api, type QuestionSort } from "../lib/api";
import { QuestionCard } from "../components/QuestionCard";
import { QuestionListSkeleton } from "../components/Skeleton";
import { EmptyState } from "../components/EmptyState";
import { ErrorState } from "../components/ErrorState";
import { Tabs, type TabDef } from "../components/Tabs";
import { useMeta } from "../lib/meta";

const tabs: TabDef<QuestionSort>[] = [
  { value: "new", label: "★ NEW" },
  { value: "top", label: "TOP" },
  { value: "unanswered", label: "UNANSWERED" },
];

export default function Tag() {
  const { tag = "" } = useParams();
  const [params, setParams] = useSearchParams();
  const sort = ((tabs.map((t) => t.value) as string[]).includes(
    params.get("sort") ?? "",
  )
    ? params.get("sort")
    : "new") as QuestionSort;

  useMeta({
    title: `#${tag} — asq.fyi`,
    description: `Questions tagged #${tag} on asq.fyi.`,
  });

  const q = useQuery({
    queryKey: ["questions", { sort, tag }],
    queryFn: () => api.listQuestions({ sort, tag, limit: 20 }),
  });

  const onTab = (value: QuestionSort) => {
    const next = new URLSearchParams(params);
    if (value === "new") next.delete("sort");
    else next.set("sort", value);
    setParams(next, { replace: true });
  };

  return (
    <>
      <div className="crumbs">
        <div className="wrap-1240 crumbs__row">
          <Link to="/">FEED</Link>
          <span className="sep">/</span>
          <span>TOPIC</span>
          <span className="id">#{tag.toUpperCase()}</span>
        </div>
      </div>

      <div
        className="wrap-1240"
        style={{ padding: "var(--s-6) var(--s-5) var(--s-8)" }}
      >
        <div className="section__head">
          <div>
            <div className="section__num">§ TOPIC</div>
            <h1
              className="section__title"
              style={{ display: "flex", alignItems: "baseline", gap: 8 }}
            >
              <span style={{ color: "var(--red)" }}>#</span>
              {tag}
            </h1>
          </div>
          <p className="section__sub">
            {q.data
              ? `${q.data.items.length}${q.data.cursor ? "+" : ""} question${
                  q.data.items.length === 1 ? "" : "s"
                } tagged #${tag}.`
              : "Questions tagged with this topic."}
          </p>
        </div>

        <Tabs tabs={tabs} value={sort} onChange={onTab} label="Sort" />

        {q.isLoading ? (
          <QuestionListSkeleton />
        ) : q.isError ? (
          <ErrorState
            message={q.error instanceof Error ? q.error.message : undefined}
          />
        ) : !q.data || q.data.items.length === 0 ? (
          <EmptyState
            title={`Nothing tagged #${tag} yet.`}
            body="When someone asks with this tag, it'll show up here."
            action={
              <Link to="/ask" className="btn btn--primary btn--sm">
                ★ ASK ONE
              </Link>
            }
          />
        ) : (
          <div className="feed">
            {q.data.items.map((item) => (
              <QuestionCard
                key={item.uri}
                question={item}
                feedQueryKey={["questions", { sort, tag }]}
              />
            ))}
          </div>
        )}
      </div>
    </>
  );
}
