import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api, ApiRequestError } from "../lib/api";
import { useSession } from "../lib/session";

type Direction = "up" | "down";

export interface VoteState {
  score: number;
  viewerVote: Direction | null;
}

type Size = "sm" | "big";

/**
 * Interactive vote control with optimistic updates.
 *
 * `readFrom` reads the current vote state from the React Query cache entry
 * at `queryKey`. `writeTo` applies a patch to that entry. Keeps the component
 * agnostic to the exact cache shape (question detail, feed item, etc.).
 */
export function VoteButtons<T>({
  subjectUri,
  subjectCid,
  queryKey,
  readFrom,
  writeTo,
  size = "sm",
  label,
}: {
  subjectUri: string;
  subjectCid: string;
  queryKey: readonly unknown[];
  readFrom: (data: T) => VoteState | null;
  writeTo: (data: T, patch: Partial<VoteState>) => T;
  size?: Size;
  label?: string;
}) {
  const qc = useQueryClient();
  const session = useSession();

  const current = qc.getQueryData<T>(queryKey);
  const state = current ? readFrom(current) : null;

  const mutation = useMutation({
    mutationFn: (direction: Direction) =>
      api.vote({ subjectUri, subjectCid, direction }),
    onMutate: async (direction) => {
      await qc.cancelQueries({ queryKey });
      const prev = qc.getQueryData<T>(queryKey);
      if (!prev) return { prev };
      const s = readFrom(prev);
      if (!s) return { prev };
      const wasDir = s.viewerVote;
      let newScore = s.score;
      let newViewer: Direction | null = direction;
      if (wasDir === direction) {
        newScore += direction === "up" ? -1 : 1;
        newViewer = null;
      } else {
        if (wasDir === "up") newScore -= 1;
        if (wasDir === "down") newScore += 1;
        newScore += direction === "up" ? 1 : -1;
      }
      qc.setQueryData<T>(queryKey, (d) =>
        d === undefined ? d : writeTo(d, { score: newScore, viewerVote: newViewer }),
      );
      return { prev };
    },
    onError: (err, _dir, ctx) => {
      if (ctx?.prev !== undefined) qc.setQueryData(queryKey, ctx.prev);
      if (err instanceof ApiRequestError) {
        console.warn("vote failed:", err.message);
      }
    },
  });

  const disabled = !session.data;
  const score = state?.score ?? 0;
  const viewerVote = state?.viewerVote ?? null;

  if (size === "big") {
    return (
      <div className="vote-big" title={disabled ? "Log in to vote" : undefined}>
        <button
          type="button"
          aria-label="Upvote"
          aria-pressed={viewerVote === "up"}
          disabled={disabled}
          className={`up${viewerVote === "up" ? " active" : ""}`}
          onClick={() => mutation.mutate("up")}
        >
          ▲
        </button>
        <span className="score">{score > 0 ? `+${score}` : score}</span>
        <button
          type="button"
          aria-label="Downvote"
          aria-pressed={viewerVote === "down"}
          disabled={disabled}
          className={`down${viewerVote === "down" ? " active" : ""}`}
          onClick={() => mutation.mutate("down")}
        >
          ▼
        </button>
        {label ? <span className="label">{label}</span> : null}
      </div>
    );
  }

  return (
    <div className="vote vote--horiz" title={disabled ? "Log in to vote" : undefined}>
      <button
        type="button"
        aria-label="Upvote"
        aria-pressed={viewerVote === "up"}
        disabled={disabled}
        className={`up${viewerVote === "up" ? " active" : ""}`}
        onClick={() => mutation.mutate("up")}
      >
        ▲
      </button>
      <span className="score">{score}</span>
      <button
        type="button"
        aria-label="Downvote"
        aria-pressed={viewerVote === "down"}
        disabled={disabled}
        className={`down${viewerVote === "down" ? " active" : ""}`}
        onClick={() => mutation.mutate("down")}
      >
        ▼
      </button>
    </div>
  );
}
