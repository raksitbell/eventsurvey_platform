interface EventAccessState {
  isPrivate: boolean;
  hasRegistration: boolean;
  hasSurvey: boolean;
  surveyAccess: "public" | "registered_only" | null;
}

/** Private event drafts always include the registration form used by their Whitelist. */
export function normalizeEventAccess<T extends EventAccessState>(state: T): T {
  const hasRegistration = state.isPrivate || state.hasRegistration;
  const surveyAccess: EventAccessState["surveyAccess"] = !state.hasSurvey
    ? null
    : !hasRegistration || state.surveyAccess !== "registered_only"
      ? "public"
      : "registered_only";
  return { ...state, hasRegistration, surveyAccess };
}
