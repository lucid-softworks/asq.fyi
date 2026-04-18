import type {
  AcceptAnswerInput,
  CreateAnswerInput,
  CreateCommentInput,
  CreateQuestionInput,
  VoteInput,
} from "@asq/shared";
import type {
  ApiError,
  Paginated,
  ProfileSummary,
  ProfileView,
  QuestionCard,
  QuestionDetail,
  TagCount,
} from "./types";

/**
 * Base URL for the API. Same-origin now that the TanStack Start app hosts
 * the HTTP API and the UI together. Empty string means relative paths.
 */
const BASE = "";

export class ApiRequestError extends Error {
  constructor(
    public status: number,
    public body: ApiError,
  ) {
    super(body.message || body.error || `HTTP ${status}`);
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    credentials: "include",
    ...init,
    headers: {
      "content-type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) {
    let body: ApiError;
    try {
      body = (await res.json()) as ApiError;
    } catch {
      body = { error: "internal", message: res.statusText };
    }
    throw new ApiRequestError(res.status, body);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

function qs(params: Record<string, string | number | undefined>): string {
  const entries = Object.entries(params).filter(
    ([, v]) => v !== undefined && v !== "",
  );
  if (!entries.length) return "";
  const search = new URLSearchParams();
  for (const [k, v] of entries) search.set(k, String(v));
  return `?${search.toString()}`;
}

export type QuestionSort =
  | "new"
  | "top"
  | "unanswered"
  | "trending"
  | "most_viewed"
  | "most_discussed";

export const api = {
  listQuestions(args: {
    sort?: QuestionSort;
    tag?: string;
    cursor?: string;
    limit?: number;
  }) {
    return request<Paginated<QuestionCard>>(`/api/questions${qs(args)}`);
  },
  getQuestion(uri: string) {
    return request<QuestionDetail>(
      `/api/questions/${encodeURIComponent(uri)}`,
    );
  },
  getProfile(handle: string) {
    return request<ProfileView>(`/api/profiles/${encodeURIComponent(handle)}`);
  },
  listTags(args: { sort?: "popular" | "trending"; limit?: number }) {
    return request<{ items: TagCount[] }>(`/api/tags${qs(args)}`);
  },
  search(args: { q: string; cursor?: string; limit?: number }) {
    return request<Paginated<QuestionCard & { rank: number }>>(
      `/api/search${qs(args)}`,
    );
  },
  me() {
    return request<ProfileSummary>("/api/me");
  },
  logout() {
    return request<void>("/auth/logout", { method: "POST" });
  },
  loginUrl(handle: string) {
    return `/auth/login?handle=${encodeURIComponent(handle)}`;
  },
  createQuestion(input: CreateQuestionInput) {
    return request<{ uri: string; cid: string; authorDid: string }>(
      "/api/questions",
      { method: "POST", body: JSON.stringify(input) },
    );
  },
  createAnswer(questionUri: string, input: CreateAnswerInput) {
    return request<{
      uri: string;
      cid: string;
      questionUri: string;
      authorDid: string;
    }>(`/api/questions/${encodeURIComponent(questionUri)}/answers`, {
      method: "POST",
      body: JSON.stringify(input),
    });
  },
  createComment(input: CreateCommentInput) {
    return request<{ uri: string; cid: string; authorDid: string }>(
      "/api/comments",
      { method: "POST", body: JSON.stringify(input) },
    );
  },
  vote(input: VoteInput) {
    return request<
      | { toggledOff: true; direction: null }
      | {
          toggledOff: false;
          direction: "up" | "down";
          uri: string;
          cid: string;
        }
    >("/api/vote", { method: "POST", body: JSON.stringify(input) });
  },
  acceptAnswer(questionUri: string, input: AcceptAnswerInput) {
    return request<{ uri: string; cid: string }>(
      `/api/questions/${encodeURIComponent(questionUri)}/accept`,
      { method: "POST", body: JSON.stringify(input) },
    );
  },
  deleteRecord(uri: string) {
    return request<void>(`/api/records/${encodeURIComponent(uri)}`, {
      method: "DELETE",
    });
  },
  listTrending(args: { window?: "24h" | "7d"; limit?: number } = {}) {
    return request<Paginated<QuestionCard>>(`/api/trending${qs(args)}`);
  },
};
