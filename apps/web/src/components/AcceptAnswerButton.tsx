import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import { Spinner } from "./Spinner";
import { useToast } from "./Toast";

export function AcceptAnswerButton({
  questionUri,
  answerUri,
  answerCid,
  isAccepted,
}: {
  questionUri: string;
  answerUri: string;
  answerCid: string;
  isAccepted: boolean;
}) {
  const qc = useQueryClient();
  const toast = useToast();
  const mutation = useMutation({
    mutationFn: () => api.acceptAnswer(questionUri, { answerUri, answerCid }),
    onError: (err) =>
      toast.push(
        "error",
        err instanceof Error ? err.message : "Failed to accept answer",
      ),
    onSuccess: () => {
      toast.push("success", "Answer accepted.");
      qc.invalidateQueries({ queryKey: ["question", questionUri] });
    },
  });

  return (
    <button
      type="button"
      className={`btn btn--xs ${isAccepted ? "btn--mustard" : ""}`}
      onClick={() => mutation.mutate()}
      disabled={isAccepted || mutation.isPending}
      aria-pressed={isAccepted}
    >
      {isAccepted ? (
        "✓ ACCEPTED"
      ) : mutation.isPending ? (
        <>
          <Spinner /> ACCEPTING
        </>
      ) : (
        "★ ACCEPT"
      )}
    </button>
  );
}
