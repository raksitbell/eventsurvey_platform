import { toBangkokInput } from "@/core/i18n/bangkok-datetime";
import {
  activityActions,
  type ActivityAction,
  type ActivityActor,
  type ActivityData,
  type ActivityEvent,
  type ActivityFilters,
  type ActivityRecord,
  type ActivitySearchKey,
} from "@/types/activity";

const actors: ActivityActor[] = [
  {
    id: "pimchanok",
    name: "Pimchanok Siri",
    nameTh: "พิมพ์ชนก ศิริ",
    role: "eventAdmin",
  },
  {
    id: "thanakorn",
    name: "Thanakorn Wattana",
    nameTh: "ธนกร วัฒนะ",
    role: "eventAdmin",
  },
  {
    id: "napatsorn",
    name: "Napatsorn Pong",
    nameTh: "นภัสสร พงษ์",
    role: "eventAdmin",
  },
  {
    id: "raksit",
    name: "Raksit Wongthong",
    nameTh: "รัชสิต วงศ์ทอง",
    role: "platformAdmin",
  },
  { id: "nicha", name: "Nicha Arun", nameTh: "ณิชา อรุณ", role: "eventAdmin" },
  {
    id: "kawin",
    name: "Kawin Prasert",
    nameTh: "กวิน ประเสริฐ",
    role: "eventAdmin",
  },
  {
    id: "malinee",
    name: "Malinee Chuenjai",
    nameTh: "มาลินี ชื่นใจ",
    role: "eventAdmin",
  },
  {
    id: "teerapat",
    name: "Teerapat Chantarat",
    nameTh: "ธีรภัทร จันทรัตน์",
    role: "eventAdmin",
  },
  {
    id: "warisara",
    name: "Warisara Phasuk",
    nameTh: "วริศรา ผาสุก",
    role: "eventAdmin",
  },
  {
    id: "pakkapon",
    name: "Pakkapon Saengdao",
    nameTh: "ภัคพล แสงดาว",
    role: "eventAdmin",
  },
  {
    id: "thanyarat",
    name: "Thanyarat Boonma",
    nameTh: "ธัญญารัตน์ บุญมา",
    role: "eventAdmin",
  },
  {
    id: "niran",
    name: "Niran Rungroj",
    nameTh: "นิรันดร์ รุ่งโรจน์",
    role: "eventAdmin",
  },
];

const recentRecords: ActivityRecord[] = [
  {
    id: "activity-survey-deadline",
    eventId: "book-expo-2026",
    actorUserId: "pimchanok",
    actionType: "edit",
    entityType: "postEventSurvey",
    relatedPage: "survey",
    occurredAt: "2026-11-17T09:42:00.000Z",
    changedFields: ["responseDeadline"],
    syntheticDiffs: {
      responseDeadline: { previous: "2026-11-07", current: "2026-11-08" },
    },
  },
  {
    id: "activity-event-details",
    eventId: "book-expo-2026",
    actorUserId: "thanakorn",
    actionType: "edit",
    entityType: "eventDetails",
    relatedPage: "setup",
    occurredAt: "2026-11-17T07:10:00.000Z",
    changedFields: ["description", "location"],
  },
  {
    id: "activity-registration-added",
    eventId: "product-forum-2026",
    actorUserId: "thanakorn",
    actionType: "add",
    entityType: "registrationForm",
    relatedPage: "registration",
    occurredAt: "2026-11-17T06:20:00.000Z",
    changedFields: [],
  },
  {
    id: "activity-draft-member-added",
    eventId: "book-expo-draft",
    actorUserId: "pimchanok",
    actionType: "add",
    entityType: "teamMember",
    relatedPage: "team",
    occurredAt: "2026-11-16T04:25:00.000Z",
    changedFields: [],
  },
  {
    id: "activity-expo-member-added",
    eventId: "book-expo-2026",
    actorUserId: "pimchanok",
    actionType: "add",
    entityType: "teamMember",
    relatedPage: "team",
    occurredAt: "2026-11-16T04:25:00.000Z",
    changedFields: [],
  },
  {
    id: "activity-survey-deleted",
    eventId: "book-expo-survey",
    actorUserId: "napatsorn",
    actionType: "delete",
    entityType: "surveyForm",
    relatedPage: "survey",
    occurredAt: "2026-11-16T02:08:00.000Z",
    changedFields: [],
  },
  {
    id: "activity-whitelist-deleted",
    eventId: "book-expo-2026",
    actorUserId: "raksit",
    actionType: "delete",
    entityType: "whitelist",
    relatedPage: "access",
    occurredAt: "2026-11-15T02:40:00.000Z",
    changedFields: [],
  },
  {
    id: "activity-registration-capacity",
    eventId: "book-expo-2026",
    actorUserId: "pimchanok",
    actionType: "edit",
    entityType: "registrationForm",
    relatedPage: "registration",
    occurredAt: "2026-11-14T11:05:00.000Z",
    changedFields: ["registrationCapacity"],
    syntheticDiffs: { registrationCapacity: { previous: 1000, current: 1200 } },
  },
];

const olderRecordExamples = [
  {
    actionType: "edit",
    entityType: "eventDetails",
    relatedPage: "setup",
    changedFields: ["title", "description"],
  },
  {
    actionType: "add",
    entityType: "whitelist",
    relatedPage: "access",
    changedFields: [],
  },
  {
    actionType: "edit",
    entityType: "registrationForm",
    relatedPage: "registration",
    changedFields: ["capacity"],
  },
  {
    actionType: "edit",
    entityType: "surveyForm",
    relatedPage: "survey",
    changedFields: ["questions", "settings"],
  },
  {
    actionType: "delete",
    entityType: "teamMember",
    relatedPage: "team",
    changedFields: [],
  },
  {
    actionType: "add",
    entityType: "surveyForm",
    relatedPage: "survey",
    changedFields: [],
  },
  {
    actionType: "edit",
    entityType: "teamMember",
    relatedPage: "team",
    changedFields: ["role", "permissions"],
  },
  {
    actionType: "delete",
    entityType: "whitelist",
    relatedPage: "access",
    changedFields: [],
  },
  {
    actionType: "edit",
    entityType: "eventDetails",
    relatedPage: "setup",
    changedFields: ["startDate", "endDate", "access", "status"],
  },
  {
    actionType: "add",
    entityType: "teamMember",
    relatedPage: "team",
    changedFields: [],
  },
] satisfies ReadonlyArray<
  Pick<
    ActivityRecord,
    "actionType" | "entityType" | "relatedPage" | "changedFields"
  >
>;

interface EventActivityFixture {
  event: ActivityEvent;
  counts: Record<ActivityAction, number>;
  actorIds: string[];
}

const eventFixtures: EventActivityFixture[] = [
  {
    event: {
      id: "book-expo-2026",
      name: "BOOK EXPO THAILAND 2026",
      heroNameTh: "มหกรรมหนังสือระดับชาติ ครั้งที่ 31",
      organizer: "PUBAT",
      posterUrl: "/images/user-activity/book-expo-poster.png",
    },
    counts: { edit: 49, add: 69, delete: 10 },
    actorIds: [
      "pimchanok",
      "thanakorn",
      "napatsorn",
      "raksit",
      "nicha",
      "kawin",
    ],
  },
  {
    event: { id: "product-forum-2026", name: "Product Forum 2026" },
    counts: { edit: 44, add: 43, delete: 17 },
    actorIds: ["thanakorn", "raksit", "malinee", "teerapat"],
  },
  {
    event: { id: "book-expo-draft", name: "Book Expo · Draft Demo" },
    counts: { edit: 45, add: 42, delete: 21 },
    actorIds: ["pimchanok", "nicha", "warisara", "pakkapon"],
  },
  {
    event: { id: "book-expo-survey", name: "Book Expo · Survey Demo" },
    counts: { edit: 42, add: 40, delete: 14 },
    actorIds: ["napatsorn", "kawin", "thanyarat", "niran"],
  },
];
const firstOlderTime = Date.parse("2026-11-13T11:20:00Z");
const millisecondsPerHour = 60 * 60 * 1000;

function createEventRecords(
  { event, counts, actorIds }: EventActivityFixture,
  index: number,
): ActivityRecord[] {
  const recent = recentRecords.filter((record) => record.eventId === event.id);
  const remainingCounts = { ...counts };
  for (const record of recent) remainingCounts[record.actionType] -= 1;

  // Interleave the remaining actions across months while preserving the fixture totals.
  const examples = activityActions
    .flatMap((action) => {
      const matching = olderRecordExamples.filter(
        (example) => example.actionType === action,
      );
      const count = remainingCounts[action];
      return Array.from({ length: count }, (_, entry) => ({
        example: matching[(entry + index) % matching.length],
        position: (entry + 0.5) / count,
      }));
    })
    .sort((first, second) => first.position - second.position);

  const older = examples.map(({ example }, entry) => ({
    ...example,
    id: `activity-${event.id}-${entry + 1}`,
    eventId: event.id,
    actorUserId: actorIds[(entry + index) % actorIds.length],
    occurredAt: new Date(
      firstOlderTime - (entry * 19 + index * 4) * millisecondsPerHour,
    ).toISOString(),
  }));
  return [...recent, ...older];
}

const events = eventFixtures.map(({ event }) => event);
const platformRecords = eventFixtures.flatMap(createEventRecords);
const bookExpoRecords = platformRecords.filter(
  (record) => record.eventId === events[0].id,
);

export function getMockActivityData(event?: ActivityEvent): ActivityData {
  if (!event) return { events, actors, records: platformRecords };

  const platformEventRecords = platformRecords.filter(
    (record) => record.eventId === event.id,
  );
  const records = platformEventRecords.length
    ? platformEventRecords
    : bookExpoRecords.map((record) => ({ ...record, eventId: event.id }));
  const actorIds = new Set(records.map((record) => record.actorUserId));
  return {
    events: [event],
    actors: actors.filter((actor) => actorIds.has(actor.id)),
    records,
  };
}

function normalizeSearch(value: string, locale: string) {
  return value.normalize("NFKC").toLocaleLowerCase(locale);
}

export function filterActivity(
  data: ActivityData,
  filters: ActivityFilters,
  locale: string,
  getLabel?: (key: ActivitySearchKey) => string,
): ActivityRecord[] {
  const search = normalizeSearch(filters.search.trim(), locale);
  const eventById = new Map(data.events.map((event) => [event.id, event]));
  const actorById = new Map(data.actors.map((actor) => [actor.id, actor]));

  return data.records
    .filter((record) => {
      if (filters.eventId && record.eventId !== filters.eventId) return false;
      if (filters.actorId && record.actorUserId !== filters.actorId)
        return false;
      if (filters.action && record.actionType !== filters.action) return false;
      if (
        filters.month &&
        !toBangkokInput(record.occurredAt).startsWith(`${filters.month}-`)
      )
        return false;
      if (!search) return true;

      const event = eventById.get(record.eventId);
      const actor = actorById.get(record.actorUserId);
      const keys: ActivitySearchKey[] = [
        `actions.${record.actionType}`,
        `entities.${record.entityType}`,
        `pages.${record.relatedPage}`,
        ...record.changedFields.map(
          (field): ActivitySearchKey => `fields.${field}`,
        ),
      ];
      if (actor) keys.push(`roles.${actor.role}`);

      const searchable = [
        event?.name ?? "",
        event?.heroNameTh ?? "",
        event?.organizer ?? "",
        actor?.name ?? "",
        actor?.nameTh ?? "",
        ...keys.map((key) => key.split(".")[1]),
        ...(getLabel ? keys.map(getLabel) : []),
      ];
      return searchable.some((value) =>
        normalizeSearch(value, locale).includes(search),
      );
    })
    .sort(
      (first, second) =>
        Date.parse(second.occurredAt) - Date.parse(first.occurredAt) ||
        first.id.localeCompare(second.id),
    );
}

export function getActivitySummary(records: readonly ActivityRecord[]) {
  const events = new Set<string>();
  const actors = new Set<string>();
  const counts = { edit: 0, add: 0, delete: 0 };

  for (const record of records) {
    events.add(record.eventId);
    actors.add(record.actorUserId);
    counts[record.actionType] += 1;
  }

  return {
    total: records.length,
    eventCount: events.size,
    actorCount: actors.size,
    ...counts,
  };
}
