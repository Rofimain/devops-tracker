function parseDomainList(raw: string | undefined): string[] {
  return (raw ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

/**
 * Gabungan ALLOWED_EMAIL_DOMAIN dan ALLOWED_EMAIL_DOMAINS.
 * Keduanya boleh berisi beberapa domain dipisah koma (nilai digabung, tanpa duplikat).
 * Kosong = tidak ada pembatasan domain di callback signIn.
 */
export function getAllowedEmailDomains(): string[] {
  const set = new Set<string>([
    ...parseDomainList(process.env.ALLOWED_EMAIL_DOMAIN),
    ...parseDomainList(process.env.ALLOWED_EMAIL_DOMAINS),
  ]);
  return Array.from(set);
}

export function isEmailFromAllowedDomain(email: string): boolean {
  const allowed = getAllowedEmailDomains();
  if (allowed.length === 0) return true;
  const lower = email.trim().toLowerCase();
  return allowed.some((d) => lower.endsWith(`@${d}`));
}

/** Untuk teks UI: "@a.com, @b.com" atau string kosong jika tidak ada pembatasan */
export function formatAllowedDomainsDisplay(): string {
  const d = getAllowedEmailDomains();
  if (d.length === 0) return "";
  return d.map((x) => `@${x}`).join(", ");
}
