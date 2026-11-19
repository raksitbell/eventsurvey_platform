export const eventSetupMediaIdPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

const mediaPrefix = "/api/event/setup/media/";

export function eventSetupMediaUrl(id: string) {
  return mediaPrefix + id;
}

export function isEventSetupMediaUrl(url: string) {
  return (
    url.startsWith(mediaPrefix) &&
    eventSetupMediaIdPattern.test(url.slice(mediaPrefix.length))
  );
}
