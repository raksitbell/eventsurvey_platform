/**
 * Browser client for EventSurvey's own Next.js API (`/api/...`).
 * Aggregated/bound responses live here; raw mock resources are fetched server-side.
 */

export interface ApiValidationDetail {
  path: string;
  message: string;
}

export class ApiError extends Error {
  status: number;
  code?: string;
  details?: ApiValidationDetail[];
  body?: unknown;

  constructor(
    message: string,
    status: number,
    body?: unknown,
    code?: string,
    details?: ApiValidationDetail[],
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
    this.code = code;
    this.details = details;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`/api${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  if (!response.ok) {
    let message = response.statusText;
    let code: string | undefined;
    let details: ApiValidationDetail[] | undefined;
    let body: unknown;
    try {
      body = await response.json();
      if (body && typeof body === "object") {
        const errObj = body as {
          error?: unknown;
          message?: unknown;
          details?: unknown;
        };
        if (typeof errObj.error === "string") {
          code = errObj.error;
          message = errObj.error;
        }
        if (typeof errObj.message === "string" && errObj.message.trim()) {
          message = errObj.message;
        }
        if (Array.isArray(errObj.details)) {
          details = errObj.details.filter(
            (item): item is ApiValidationDetail =>
              Boolean(item) &&
              typeof item === "object" &&
              typeof (item as ApiValidationDetail).path === "string" &&
              typeof (item as ApiValidationDetail).message === "string",
          );
        }
      }
    } catch {
      // ignore parse errors
    }
    throw new ApiError(message, response.status, body, code, details);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body: unknown) =>
    request<T>(path, { method: "POST", body: JSON.stringify(body) }),
  put: <T>(path: string, body: unknown) =>
    request<T>(path, { method: "PUT", body: JSON.stringify(body) }),
  patch: <T>(path: string, body: unknown) =>
    request<T>(path, { method: "PATCH", body: JSON.stringify(body) }),
  delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
};
