/**
 * Server-side client for the external mock JSON Server.
 * Use only from Route Handlers / Server Components — not from the browser.
 */

export const MOCK_API_BASE_URL =
  process.env.MOCK_API_BASE_URL ??
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  "https://eventmockapi.vercel.app";

export class MockApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "MockApiError";
    this.status = status;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${MOCK_API_BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    // Always get fresh mock data when binding on the server
    cache: "no-store",
  });

  if (!response.ok) {
    throw new MockApiError(
      `Mock API failed: ${response.statusText}`,
      response.status,
    );
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export const mockApi = {
  delete: (path: string) => request<unknown>(path, { method: "DELETE" }),
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body: unknown) =>
    request<T>(path, { method: "POST", body: JSON.stringify(body) }),
  patch: <T>(path: string, body: unknown) =>
    request<T>(path, { method: "PATCH", body: JSON.stringify(body) }),
};
