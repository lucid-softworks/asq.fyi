import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createCommentSchema } from "@asq/shared";
import { api } from "../lib/api";
import { Spinner } from "./Spinner";
import { useToast } from "./Toast";

export function CommentComposer({
  subjectUri,
  subjectCid,
  parentUri,
  parentCid,
  questionUri,
  onDone,
}: {
  subjectUri: string;
  subjectCid: string;
  parentUri?: string;
  parentCid?: string;
  questionUri: string;
  onDone?: () => void;
}) {
  const qc = useQueryClient();
  const toast = useToast();
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: async () => {
      const input = {
        subjectUri,
        subjectCid,
        parentUri,
        parentCid,
        body,
      };
      const parsed = createCommentSchema.parse(input);
      return api.createComment(parsed);
    },
    onError: (err) => {
      const msg = err instanceof Error ? err.message : "Failed to post";
      setError(msg);
      toast.push("error", msg);
    },
    onSuccess: () => {
      setError(null);
      setBody("");
      toast.push("success", parentUri ? "Reply posted." : "Comment posted.");
      qc.invalidateQueries({ queryKey: ["question", questionUri] });
      onDone?.();
    },
  });

  const canSubmit =
    body.trim().length > 0 && body.length <= 1000 && !mutation.isPending;

  return (
    <form
      className="composer composer--comment"
      onSubmit={(e) => {
        e.preventDefault();
        if (!canSubmit) return;
        mutation.mutate();
      }}
    >
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        onKeyDown={(e) => {
          if ((e.metaKey || e.ctrlKey) && e.key === "Enter" && canSubmit) {
            e.preventDefault();
            mutation.mutate();
          }
        }}
        rows={2}
        placeholder={parentUri ? "Write a reply…" : "Add a comment…"}
        className="textarea"
      />
      <div className="composer__row">
        <span className={`counter${body.length > 1000 ? " over" : ""}`}>
          {body.length} / 1000
        </span>
        <div className="row gap-2">
          {onDone ? (
            <button
              type="button"
              onClick={onDone}
              className="btn btn--xs btn--ghost"
            >
              CANCEL
            </button>
          ) : null}
          <button
            type="submit"
            disabled={!canSubmit}
            className="btn btn--xs btn--primary"
          >
            {mutation.isPending ? (
              <>
                <Spinner /> POSTING
              </>
            ) : parentUri ? (
              "REPLY"
            ) : (
              "COMMENT"
            )}
          </button>
        </div>
      </div>
      {error ? <div className="alert">{error}</div> : null}
    </form>
  );
}
