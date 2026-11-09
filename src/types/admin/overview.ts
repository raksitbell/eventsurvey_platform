export type HealthStatus = "operational" | "attention";

export interface MetricPair {
  active: number;
  total: number;
}

export type EventStatusKey = "draft" | "scheduled" | "open" | "closed";

export interface AdminOverviewResponse {
  metrics: {
    events: MetricPair;
    users: MetricPair;
    registrationForms: MetricPair;
    surveys: MetricPair;
  };
  health: {
    coreApi: HealthStatus;
    database: HealthStatus;
    formSystem: HealthStatus;
  };
  recentActivity: Array<{
    id: string;
    action: string;
    description: string;
    at: string;
    resourceType: string;
  }>;
  growth: {
    categories: string[];
    series: {
      users: number[];
      events: number[];
      responses: number[];
    };
    forecastCategories: string[];
    forecast: {
      users: number[];
      events: number[];
      responses: number[];
    };
  };
  eventStatusBreakdown: Array<{
    status: EventStatusKey;
    count: number;
  }>;
  topEvents: Array<{
    eventId: string;
    title: string;
    responseCount: number;
  }>;
  piiActivity: Array<{
    id: string;
    action: string;
    description: string;
    at: string;
    resourceType: string;
  }>;
}
