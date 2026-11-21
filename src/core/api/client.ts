/**
 * Browser client for EventSurvey's own Next.js API (`/api/...`).
 * Aggregated/bound responses live here; raw mock resources are fetched server-side.
 */

export const PORTAL_UNAUTHORIZED_EVENT = "eventsurvey:unauthorized";

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

async function request(path: string, init?: RequestInit): Promise<Response> {
  const headers = new Headers(init?.headers);
  if (!(init?.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  const response = await fetch(`/api${path}`, {
    ...init,
    headers,
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
    // The session endpoint already handles revocation and clears the HttpOnly cookie.
    if (
      response.status === 401 &&
      code === "UNAUTHORIZED" &&
      path.split("?")[0] !== "/auth/session" &&
      !init?.signal?.aborted &&
      typeof globalThis.window !== "undefined"
    ) {
      globalThis.window.dispatchEvent(new Event(PORTAL_UNAUTHORIZED_EVENT));
    }
    throw new ApiError(message, response.status, body, code, details);
  }

  return response;
}

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await request(path, init);
  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export const api = {
  get: <T>(path: string, signal?: AbortSignal) =>
    requestJson<T>(path, { signal }),
  getBlob: async (path: string) => (await request(path)).blob(),
  post: <T>(path: string, body: unknown) =>
    requestJson<T>(path, { method: "POST", body: JSON.stringify(body) }),
  postForm: <T>(path: string, body: FormData) =>
    requestJson<T>(path, { method: "POST", body }),
  put: <T>(path: string, body: unknown) =>
    requestJson<T>(path, { method: "PUT", body: JSON.stringify(body) }),
  patch: <T>(path: string, body: unknown) =>
    requestJson<T>(path, { method: "PATCH", body: JSON.stringify(body) }),
  delete: <T>(path: string) => requestJson<T>(path, { method: "DELETE" }),
};
