import type { MockEventStatus } from "@/types/mock";

export function isTrashableEventStatus(status: MockEventStatus): boolean {
  return status === "draft" || status === "closed";
}
