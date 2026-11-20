import {
  publicEventPath,
  type EventShareKind,
} from "@/core/event/public-event-paths";

export function eventShareOrigin(
  value: string | undefined = process.env.APP_URL ??
    process.env.NEXT_PUBLIC_APP_URL,
  allowLoopback = process.env.NODE_ENV === "development",
): string | null {
  if (!value) return null;

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return null;
  }

  if (
    url.username ||
    url.password ||
    url.pathname !== "/" ||
    url.search ||
    url.hash
  ) {
    return null;
  }

  const localHttp =
    allowLoopback &&
    url.protocol === "http:" &&
    ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
  return url.protocol === "https:" || localHttp ? url.origin : null;
}

export function eventShareUrl(
  origin: string,
  slug: string,
  kind?: EventShareKind,
) {
  return new URL(publicEventPath(slug, kind), origin).href;
}
