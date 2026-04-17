/** Kunci body purge yang diizinkan Cloudflare (tanpa purge_everything). */
const ALLOWED_KEYS = new Set(["files", "hosts", "prefixes", "tags"]);

export function sanitizePurgeBody(input: unknown): Record<string, string[]> | null {
  if (!input || typeof input !== "object" || Array.isArray(input)) return null;
  const o = input as Record<string, unknown>;
  const out: Record<string, string[]> = {};
  for (const key of Array.from(ALLOWED_KEYS)) {
    if (!(key in o)) continue;
    const v = o[key];
    if (!Array.isArray(v)) return null;
    const strings = v.map((x) => (typeof x === "string" ? x.trim() : "")).filter(Boolean);
    if (strings.length === 0) continue;
    out[key] = strings;
  }
  if (Object.keys(out).length === 0) return null;
  return out;
}
