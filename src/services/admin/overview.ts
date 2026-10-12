import { mockApi } from "@/core/api/mock-client";
import type { AdminOverviewResponse } from "@/types/admin/overview";
import type { MockEvent, MockForm, MockSubmission } from "@/types/mock";
import type { User } from "@/types/user";

/** Bind users + events + forms + submissions for platform overview KPIs */
export async function getBoundAdminOverview(): Promise<AdminOverviewResponse> {
  const [users, events, forms, submissions] = await Promise.all([
    mockApi.get<User[]>("/users?isDeleted=false"),
    mockApi.get<MockEvent[]>("/events?isDeleted=false"),
    mockApi.get<MockForm[]>("/forms?isDeleted=false"),
    mockApi.get<MockSubmission[]>("/submissions?isDeleted=false"),
  ]);

  const owners = users.filter((user) => user.role === "event_owner").length;
  const publishedForms = forms.filter(
    (form) => form.status === "approved",
  ).length;

  const recentOwners = [...users]
    .filter((user) => user.role === "event_owner")
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    )
    .slice(0, 1)
    .map((user) => ({
      id: `owner-${user.id}`,
      type: "owner" as const,
      labelKey: "ownerInvited" as const,
      at: user.createdAt,
    }));

  const recentForms = [...forms]
    .filter((form) => form.status === "approved")
    .sort((a, b) => a.id.localeCompare(b.id))
    .slice(-1)
    .map((form) => ({
      id: `form-${form.id}`,
      type: "form" as const,
      labelKey: "formPublished" as const,
      at: new Date().toISOString(),
    }));

  const recentEvents = [...events]
    .filter((event) => event.status === "closed")
    .slice(0, 1)
    .map((event) => ({
      id: `event-${event.id}`,
      type: "event" as const,
      labelKey: "eventClosed" as const,
      at: new Date().toISOString(),
    }));

  return {
    metrics: {
      owners,
      events: events.length,
      forms: publishedForms,
      responses: submissions.length,
    },
    recentActivity: [...recentOwners, ...recentForms, ...recentEvents],
  };
}
