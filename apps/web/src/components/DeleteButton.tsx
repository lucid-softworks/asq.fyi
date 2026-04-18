import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import { Spinner } from "./Spinner";
import { useToast } from "./Toast";

export function DeleteButton({
  uri,
  label = "DELETE",
  confirm = "Delete this record? This cannot be undone.",
  onDeleted,
  invalidateKeys = [],
}: {
  uri: string;
  label?: string;
  confirm?: string;
  onDeleted?: () => void;
  invalidateKeys?: Array<readonly unknown[]>;
}) {
  const qc = useQueryClient();
  const toast = useToast();
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: async () => {
      await api.deleteRecord(uri);
    },
    onError: (err) => {
      const msg = err instanceof Error ? err.message : "Delete failed";
      setError(msg);
      toast.push("error", msg);
    },
    onSuccess: () => {
      setError(null);
      toast.push("success", "Deleted.");
      for (const key of invalidateKeys) {
        qc.invalidateQueries({ queryKey: key });
      }
      onDeleted?.();
    },
  });

  return (
    <>
      <button
        type="button"
        onClick={() => {
          if (window.confirm(confirm)) mutation.mutate();
        }}
        disabled={mutation.isPending}
      >
        {mutation.isPending ? (
          <>
            <Spinner /> DELETING
          </>
        ) : (
          label
        )}
      </button>
      {error ? <span className="mono" style={{ marginLeft: 6, color: "var(--red)" }}>{error}</span> : null}
    </>
  );
}
