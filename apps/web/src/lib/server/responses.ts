/**
 * Shared JSON response helpers — keep the error envelope shape identical
 * to what the old Elysia API returned so the client `ApiRequestError`
 * parsing continues to work unchanged.
 */
export interface ApiErrorBody {
  error: string;
  message: string;
  details?: unknown;
  retryAfter?: number;
}

export function json<T>(data: T, init?: ResponseInit): Response {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: {
      "content-type": "application/json; charset=utf-8",
      ...(init?.headers ?? {}),
    },
  });
}

export function error(
  status: number,
  body: ApiErrorBody,
  headers?: HeadersInit,
): Response {
  return json(body, { status, headers });
}

export const unauthorized = (): Response =>
  error(401, { error: "unauthorized", message: "Not logged in" });

export const notFound = (message = "Not found"): Response =>
  error(404, { error: "not_found", message });

export const forbidden = (message: string): Response =>
  error(403, { error: "forbidden", message });

export const validationFailed = (err: unknown): Response => {
  const details =
    err && typeof err === "object" && "issues" in err
      ? (err as { issues: unknown }).issues
      : undefined;
  return error(400, {
    error: "validation_failed",
    message: err instanceof Error ? err.message : "Invalid input",
    details,
  });
};

export const serverError = (err: unknown): Response => {
  console.error(err);
  return error(500, {
    error: "internal",
    message: "Internal server error",
  });
};

export const noContent = (): Response => new Response(null, { status: 204 });
