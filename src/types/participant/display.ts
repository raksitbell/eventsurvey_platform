export type EventDisplayLayout = "portrait" | "square" | "landscape";

export interface EventDisplayData {
  title: string;
  organizer: string;
  organizerInitial: string;
  startsAt: string;
  endsAt: string;
  location: string;
  locationDetail: string;
  description: string;
  socialHandle: string;
}
