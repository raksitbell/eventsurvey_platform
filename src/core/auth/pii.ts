import type { User } from "@/types/user";

export type PiiViewer = {
  userId: string;
  canViewUnmaskedPii: boolean;
};

const MASK = "•••";

function maskPrefix(value: string): string {
  const characters = Array.from(value);
  return characters.length > 1 ? `${characters[0]}${MASK}` : MASK;
}

export function maskName(value: string): string {
  const name = value.trim();
  return name ? name.split(/\s+/u).map(maskPrefix).join(" ") : "";
}

export function maskEmail(value: string): string {
  if (!value) return "";
  const [mailbox, domain, ...rest] = value.split("@");
  if (!mailbox || !domain || rest.length) return MASK;
  const domainParts = domain.split(".");
  const topLevelDomain = domainParts.pop();
  const suffix =
    domainParts.length && topLevelDomain && /^[a-z]{2,}$/i.test(topLevelDomain)
      ? `.${topLevelDomain}`
      : "";
  return `${maskPrefix(mailbox)}@${maskPrefix(domainParts.join(".") || domain)}${suffix}`;
}

function maskPhone(value: string): string {
  if (!value) return "";
  const digits = value.replace(/[^0-9]/g, "");
  return digits.length > 4 ? `${MASK}${digits.slice(-4)}` : MASK;
}

export function mayViewPii(viewer: PiiViewer | undefined, userId: string): boolean {
  return Boolean(viewer && (viewer.userId === userId || viewer.canViewUnmaskedPii));
}

export function projectUserPii(user: User, allowUnmasked: boolean): User {
  const projected = { ...user };
  delete projected.password;
  if (!allowUnmasked) {
    projected.name = maskName(user.name);
    projected.email = maskEmail(user.email);
    projected.phone = user.phone === null ? null : maskPhone(user.phone);
  }
  return projected;
}
