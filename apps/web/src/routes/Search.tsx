import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { api } from "../lib/api";
import { QuestionCard } from "../components/QuestionCard";
import { QuestionListSkeleton } from "../components/Skeleton";
import { EmptyState } from "../components/EmptyState";
import { ErrorState } from "../components/ErrorState";
import { useMeta } from "../lib/meta";

export default function Search() {
  const [params] = useSearchParams();
  const q = (params.get("q") ?? "").trim();
  useMeta({
    title: q ? `Search: ${q} — asq.fyi` : "Search — asq.fyi",
  });

  const res = useQuery({
    queryKey: ["search", q],
    queryFn: () => api.search({ q, limit: 20 }),
    enabled: q.length > 0,
  });

  return (
    <div
      className="wrap-1240"
      style={{ padding: "var(--s-6) var(--s-5) var(--s-8)" }}
    >
      <div className="section__head">
        <div>
          <div className="section__num">§ SEARCH</div>
          <h1 className="section__title">
            {q ? `"${q}"` : "find a question"}
          </h1>
        </div>
        <p className="section__sub">
          Full-text search across question titles and bodies.
        </p>
      </div>

      {q.length === 0 ? (
        <EmptyState
          title="Start typing to search."
          body="Use the search box at the top."
        />
      ) : res.isLoading ? (
        <QuestionListSkeleton />
      ) : res.isError ? (
        <ErrorState
          message={res.error instanceof Error ? res.error.message : undefined}
        />
      ) : !res.data || res.data.items.length === 0 ? (
        <EmptyState
          title={`No matches for "${q}".`}
          body="Try different words or check spelling."
        />
      ) : (
        <>
          <p
            className="mono"
            style={{
              color: "var(--ink-3)",
              marginBottom: "var(--s-3)",
              fontSize: "var(--t-xs)",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
            }}
          >
            {res.data.items.length}
            {res.data.cursor ? "+" : ""} result
            {res.data.items.length === 1 ? "" : "s"}
          </p>
          <div className="feed">
            {res.data.items.map((item) => (
              <QuestionCard
                key={item.uri}
                question={item}
                feedQueryKey={["search", q]}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
