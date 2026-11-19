const eventShareSegments = {
  event: "",
  registration: "register",
  survey: "survey",
} as const;

export type EventShareKind = keyof typeof eventShareSegments;

const reportingSegments = new Set([
  "analytics",
  "dashboard",
  "exports",
  "responses",
  "trash",
]);

export function isEventReportingPath(pathname: string): boolean {
  const [root, area, section] = pathname.split("/");
  return root === "" && area === "event" && reportingSegments.has(section);
}

// The portal uses these same first segments under /event.
const workspaceSegments = new Set([
  ...reportingSegments,
  "activity",
  "branding",
  "details",
  "forms",
  "publish",
  "qr",
  "setup",
  "team",
  "whitelist",
]);

export function isPublicEventSlug(slug: string): boolean {
  return (
    slug.length <= 160 &&
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) &&
    !workspaceSegments.has(slug)
  );
}

export function publicEventPath(
  slug: string,
  kind: EventShareKind = "event",
): string {
  if (!isPublicEventSlug(slug))
    throw new RangeError("Invalid public event slug");
  const base = `/event/${slug}`;
  const segment = eventShareSegments[kind];
  return segment ? `${base}/${segment}` : base;
}

/** Match canonical participant paths before next-intl adds a locale segment. */
export function isPublicEventPath(pathname: string): boolean {
  const [root, area, slug = "", action, extra] = pathname
    .replace(/\/$/, "")
    .split("/");
  return (
    root === "" &&
    area === "event" &&
    isPublicEventSlug(slug) &&
    extra === undefined &&
    (action === undefined ||
      action === eventShareSegments.registration ||
      action === eventShareSegments.survey)
  );
}
