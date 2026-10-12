export interface AdminOverviewResponse {
  metrics: {
    owners: number;
    events: number;
    forms: number;
    responses: number;
  };
  recentActivity: Array<{
    id: string;
    type: "owner" | "form" | "event";
    labelKey: "ownerInvited" | "formPublished" | "eventClosed";
    at: string;
  }>;
}
