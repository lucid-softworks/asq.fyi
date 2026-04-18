import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createAnswerSchema, type CreateAnswerInput } from "@asq/shared";
import { api } from "../lib/api";
import { Spinner } from "./Spinner";
import { useToast } from "./Toast";

export function AnswerComposer({ questionUri }: { questionUri: string }) {
  const qc = useQueryClient();
  const toast = useToast();
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: (input: CreateAnswerInput) =>
      api.createAnswer(questionUri, input),
    onError: (err) => {
      const msg = err instanceof Error ? err.message : "Failed to post";
      setError(msg);
      toast.push("error", msg);
    },
    onSuccess: () => {
      setError(null);
      setBody("");
      toast.push("success", "Answer posted.");
      qc.invalidateQueries({ queryKey: ["question", questionUri] });
    },
  });

  const parsed = createAnswerSchema.safeParse({ body });
  const canSubmit = parsed.success && !mutation.isPending;

  return (
    <form
      className="composer"
      onSubmit={(e) => {
        e.preventDefault();
        if (!canSubmit) return;
        mutation.mutate({ body });
      }}
    >
      <label htmlFor="answer-body" className="sr-only">
        Your answer
      </label>
      <textarea
        id="answer-body"
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={6}
        placeholder="Share what you know. Markdown supported."
        className="textarea"
      />
      <div className="composer__row">
        <span className="composer__hint">
          Markdown · press{" "}
          <kbd className="kbd">Cmd</kbd>+<kbd className="kbd">Enter</kbd> to
          post
        </span>
        <div className="row gap-3">
          <span className={`counter${body.length > 10000 ? " over" : ""}`}>
            {body.length} / 10000
          </span>
          <button
            type="submit"
            disabled={!canSubmit}
            className="btn btn--primary btn--sm"
          >
            {mutation.isPending ? (
              <>
                <Spinner /> POSTING
              </>
            ) : (
              "★ POST ANSWER"
            )}
          </button>
        </div>
      </div>
      {error ? <div className="alert">{error}</div> : null}
    </form>
  );
}
