import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ApiRequestError, api } from "./api";
import type { ProfileSummary } from "./types";

export function useSession() {
  return useQuery<ProfileSummary | null>({
    queryKey: ["me"],
    queryFn: async () => {
      try {
        return await api.me();
      } catch (err) {
        if (err instanceof ApiRequestError && err.status === 401) return null;
        throw err;
      }
    },
    staleTime: 60_000,
  });
}

export function useLogout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      await api.logout();
    },
    onSuccess: () => {
      qc.setQueryData(["me"], null);
    },
  });
}
