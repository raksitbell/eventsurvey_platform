import { mockApi } from "@/core/api/mock-client";
import {
  isActiveMockUser,
  mapMockUserToUser,
} from "@/core/mock/map-user";
import type { AdminOverviewResponse } from "@/types/admin/overview";
import type {
  MockEvent,
  MockForm,
  MockFormSubmission,
  MockUser,
} from "@/types/mock";
import type { User } from "@/types/user";

const PUBLISHED_FORM_STATUSES = new Set(["approved", "published"]);

/** Bind users + events + forms + form_submissions for platform overview KPIs */
export async function getBoundAdminOverview(): Promise<AdminOverviewResponse> {
  const [mockUsers, events, forms, submissions] = await Promise.all([
    mockApi.get<MockUser[]>("/users"),
    mockApi.get<MockEvent[]>("/events"),
    mockApi.get<MockForm[]>("/forms"),
    mockApi.get<MockFormSubmission[]>("/form_submissions"),
  ]);

  const liveEvents = events.filter((event) => !event.deleted_at);
  const liveForms = forms.filter((form) => !form.deleted_at);
  const liveSubmissions = submissions.filter(
    (row) => row.status === "submitted" && !row.deleted_at,
  );

  const owners = mockUsers
    .filter(isActiveMockUser)
    .map(mapMockUserToUser)
    .filter((user): user is User => user?.role === "event_owner");

  const publishedForms = liveForms.filter((form) =>
    PUBLISHED_FORM_STATUSES.has(form.status),
  );

  const recentOwners = [...owners]
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

  const recentForms = [...publishedForms]
    .sort((a, b) => {
      const aAt = a.published_at ?? a.updated_at ?? a.created_at;
      const bAt = b.published_at ?? b.updated_at ?? b.created_at;
      return new Date(aAt).getTime() - new Date(bAt).getTime();
    })
    .slice(-1)
    .map((form) => ({
      id: `form-${form.id}`,
      type: "form" as const,
      labelKey: "formPublished" as const,
      at: form.published_at ?? form.updated_at ?? form.created_at,
    }));

  const recentEvents = [...liveEvents]
    .filter((event) => event.status === "closed")
    .slice(0, 1)
    .map((event) => ({
      id: `event-${event.id}`,
      type: "event" as const,
      labelKey: "eventClosed" as const,
      at: event.closed_at ?? event.updated_at ?? event.created_at,
    }));

  return {
    metrics: {
      owners: owners.length,
      events: liveEvents.length,
      forms: publishedForms.length,
      responses: liveSubmissions.length,
    },
    recentActivity: [...recentOwners, ...recentForms, ...recentEvents],
  };
}
