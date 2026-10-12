import type { UserRole, UserStatus } from "@/types/user";

type TranslateFn = (
  key: string,
  values?: Record<string, string | number | Date>,
) => string;

export function translateRole(t: TranslateFn, role: UserRole): string {
  return t(`roles.${role}`);
}

export function translateStatus(t: TranslateFn, status: UserStatus): string {
  return t(`status.${status}`);
}
