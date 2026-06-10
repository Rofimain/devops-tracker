export function parseCommaList(raw: string): string[] {
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export function formatCommaList(items: string[]): string {
  return items.join(", ");
}
