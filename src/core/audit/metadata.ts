/** Project JSON audit details before storage or disclosure. Keep boolean passwordSet markers from account creation. */
export function projectAuditMetadata(
  metadata: Record<string, unknown> | null | undefined,
  projectText?: (value: string, field: string) => string,
): Record<string, unknown> | null {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return null;

  function projectValue(value: unknown, field: string): unknown {
    if (Array.isArray(value)) return value.map((item) => projectValue(item, field));
    if (value && typeof value === "object") return projectRecord(value);
    if (typeof value === "string" && projectText) return projectText(value, field);
    return value;
  }

  function projectRecord(record: object): Record<string, unknown> {
    const entries = Object.entries(record)
      .filter(([field, value]) =>
        !field.toLowerCase().includes("password") || (field === "passwordSet" && typeof value === "boolean"),
      )
      .map(([field, value]) => [field, projectValue(value, field)]);
    return Object.fromEntries(entries);
  }

  return projectRecord(metadata);
}
