export interface EventContentTranslation {
  localeCode: string;
  title: string;
  description: string | null;
  locationName: string | null;
  floorZone: string | null;
}

export interface EventContent {
  defaultLocale: string;
  translations: EventContentTranslation[];
}
