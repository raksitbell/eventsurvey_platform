export function toBangkokInput(value: string | null) {
  if (!value || Number.isNaN(Date.parse(value))) return "";
  return new Date(Date.parse(value) + 7 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 16);
}

export function fromBangkokInput(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return null;
  const date = new Date(`${value}:00+07:00`);
  if (
    Number.isNaN(date.getTime()) ||
    toBangkokInput(date.toISOString()) !== value
  )
    return null;
  return date.toISOString();
}
