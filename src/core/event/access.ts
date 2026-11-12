interface EventAccessState {
  hasRegistration: boolean;
  hasSurvey: boolean;
  surveyAccess: "public" | "registered_only" | null;
}

/** Figma Event Configuration: no Survey disables access; no Registration forces Direct. */
export function normalizeEventAccess<T extends EventAccessState>(state: T): T {
  const surveyAccess: EventAccessState["surveyAccess"] = !state.hasSurvey
    ? null
    : !state.hasRegistration || state.surveyAccess !== "registered_only"
      ? "public"
      : "registered_only";
  return { ...state, surveyAccess };
}
