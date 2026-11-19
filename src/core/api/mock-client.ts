/**
 * Server-side client for the external mock JSON Server.
 * Use only from Route Handlers / Server Components — not from the browser.
 *
 * GETs share an in-flight promise and a short TTL memory cache so auth +
 * service layers in the same (or warm) process do not pay repeated Vercel RTTs.
 * Any mutation clears the GET cache for that isolate.
 */

export const MOCK_API_BASE_URL = (
  process.env.MOCK_API_BASE_URL ??
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  "https://eventmockapi.vercel.app"
).replace(/\/+$/, "");

/** Default 30s; set `MOCK_API_GET_CACHE_TTL_MS=0` to disable caching. */
const GET_CACHE_TTL_MS = (() => {
  const raw = process.env.MOCK_API_GET_CACHE_TTL_MS;
  if (raw == null || raw === "") return 30_000;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 30_000;
})();

export class MockApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "MockApiError";
    this.status = status;
  }
}

type CacheEntry = {
  expiresAt: number;
  value: unknown;
};

const getCache = new Map<string, CacheEntry>();
const inflightGets = new Map<string, Promise<unknown>>();

export function invalidateMockApiGetCache() {
  getCache.clear();
}

function readGetCache<T>(key: string): T | undefined {
  if (GET_CACHE_TTL_MS <= 0) return undefined;
  const hit = getCache.get(key);
  if (!hit) return undefined;
  if (hit.expiresAt <= Date.now()) {
    getCache.delete(key);
    return undefined;
  }
  return hit.value as T;
}

function writeGetCache(key: string, value: unknown) {
  if (GET_CACHE_TTL_MS <= 0) return;
  getCache.set(key, {
    expiresAt: Date.now() + GET_CACHE_TTL_MS,
    value,
  });
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const method = (init?.method ?? "GET").toUpperCase();
  const isGet = method === "GET";

  if (isGet) {
    const cached = readGetCache<T>(normalizedPath);
    if (cached !== undefined) return cached;

    const pending = inflightGets.get(normalizedPath);
    if (pending) return pending as Promise<T>;
  }

  const run = (async (): Promise<T> => {
    const response = await fetch(`${MOCK_API_BASE_URL}${normalizedPath}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(init?.headers ?? {}),
      },
      // App-level memory cache above; never use Next's Data Cache for mock GETs.
      cache: "no-store",
    });

    if (!response.ok) {
      let detail = response.statusText;
      try {
        detail = (await response.text()) || detail;
      } catch {
        // keep statusText
      }
      throw new MockApiError(
        `Mock API failed: ${detail.slice(0, 500)}`,
        response.status,
      );
    }

    if (response.status === 204) {
      return undefined as T;
    }

    return (await response.json()) as T;
  })();

  if (isGet) {
    inflightGets.set(normalizedPath, run);
    try {
      const value = await run;
      writeGetCache(normalizedPath, value);
      return value;
    } finally {
      inflightGets.delete(normalizedPath);
    }
  }

  try {
    return await run;
  } finally {
    // Mock writes can touch many collections; clear the whole GET cache.
    invalidateMockApiGetCache();
  }
}

export const mockApi = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body: unknown) =>
    request<T>(path, { method: "POST", body: JSON.stringify(body) }),
  put: <T>(path: string, body: unknown) =>
    request<T>(path, { method: "PUT", body: JSON.stringify(body) }),
  patch: <T>(path: string, body: unknown) =>
    request<T>(path, { method: "PATCH", body: JSON.stringify(body) }),
  delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
};
