/** Kunci body purge yang diizinkan Cloudflare (tanpa purge_everything). */
const ALLOWED_KEYS = new Set(["files", "hosts", "prefixes", "tags"]);

/**
 * `zoneId` di body JSON (bukan field Cloudflare) — dipakai agar satu token bisa purge beberapa zone.
 * Dikeluarkan sebelum `sanitizePurgeBody`.
 */
export function extractZoneOverrideFromPurgeRequest(raw: unknown): { rest: unknown; zoneOverride: string | null } {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { rest: raw, zoneOverride: null };
  }
  const o = raw as Record<string, unknown>;
  let zoneOverride: string | null = null;
  if (typeof o.zoneId === "string" && o.zoneId.trim()) {
    zoneOverride = o.zoneId.trim();
  }
  const { zoneId: _z, ...rest } = o;
  return { rest, zoneOverride };
}

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

export function normalizeHostname(host: string): string {
  let h = host.trim().toLowerCase();
  if (h.endsWith(".")) h = h.slice(0, -1);
  return h;
}

/** Hostname (bukan URL) harus sama dengan apex zone atau subdomain-nya. */
export function hostnameBelongsToZone(hostname: string, zoneRoot: string): boolean {
  const h = normalizeHostname(hostname);
  const z = normalizeHostname(zoneRoot);
  if (!h || !z) return false;
  return h === z || h.endsWith(`.${z}`);
}

export function hostnameFromFileOrPrefixUrl(raw: string): string | null {
  const s = raw.trim();
  if (!s) return null;
  try {
    const u = new URL(s.includes("://") ? s : `https://${s}`);
    return normalizeHostname(u.hostname);
  } catch {
    return null;
  }
}

/**
 * Ambil nama zone (apex) dari Cloudflare — dipakai untuk validasi URL/host sebelum purge.
 */
export async function fetchCloudflareZoneName(
  zoneId: string,
  apiToken: string
): Promise<{ name: string } | { error: string }> {
  const res = await fetch(`https://api.cloudflare.com/client/v4/zones/${encodeURIComponent(zoneId)}`, {
    method: "GET",
    headers: { Authorization: `Bearer ${apiToken}` },
  });
  const data = (await res.json()) as {
    success?: boolean;
    result?: { name?: string };
    errors?: { message: string }[];
  };
  const name = data.result?.name?.trim();
  if (!res.ok || !data.success || !name) {
    const msg = data.errors?.map((e) => e.message).join("; ") || "Tidak bisa membaca zone dari Cloudflare";
    return { error: msg };
  }
  return { name: name.toLowerCase() };
}

/**
 * Pastikan semua target purge berada di bawah zone yang sama dengan Zone ID di server.
 * `tags` tidak punya hostname — purge tetap scoped ke zone ID di URL API.
 */
export function validatePurgeBodyForZone(zoneRoot: string, body: Record<string, string[]>): string | null {
  const z = normalizeHostname(zoneRoot);
  const keys = Object.keys(body);
  if (keys.length !== 1) {
    return "Gunakan hanya satu jenis purge per permintaan: files, hosts, prefixes, atau tags.";
  }
  const key = keys[0] as "files" | "hosts" | "prefixes" | "tags";
  const values = body[key];
  if (!values?.length) return "Daftar target kosong.";

  if (key === "tags") return null;

  if (key === "hosts") {
    for (const line of values) {
      const h = normalizeHostname(line);
      if (!h) return "Hostname tidak boleh kosong.";
      if (!hostnameBelongsToZone(h, z)) {
        return `Hostname "${line}" bukan bagian dari zone ${z}.`;
      }
    }
    return null;
  }

  if (key === "files") {
    for (const line of values) {
      const h = hostnameFromFileOrPrefixUrl(line);
      if (!h) return `URL tidak valid: "${line}".`;
      if (!hostnameBelongsToZone(h, z)) {
        return `URL "${line}" di luar zone ${z}.`;
      }
    }
    return null;
  }

  if (key === "prefixes") {
    for (const line of values) {
      const h = hostnameFromFileOrPrefixUrl(line);
      if (!h) return `Prefix URL tidak valid: "${line}".`;
      if (!hostnameBelongsToZone(h, z)) {
        return `Prefix "${line}" di luar zone ${z}.`;
      }
    }
    return null;
  }

  return null;
}
