/** URL eksternal: tambah https:// jika user hanya mengisi hostname (mis. sla.sent-internal.com). */
export function normalizeExternalUrl(raw: string | null | undefined): string | null {
  if (raw == null) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;

  if (/^[a-z][a-z0-9+.-]*:/i.test(trimmed)) {
    return trimmed;
  }

  if (trimmed.startsWith("//")) {
    return `https:${trimmed}`;
  }

  return `https://${trimmed.replace(/^\/+/, "")}`;
}

export function displayExternalUrl(raw: string | null | undefined): string {
  const href = normalizeExternalUrl(raw);
  if (!href) return "";
  return href.replace(/^https?:\/\//i, "");
}

export function displayRepoUrl(raw: string | null | undefined): string {
  const href = normalizeExternalUrl(raw);
  if (!href) return "";
  return href.replace(/^https:\/\/github\.com\//i, "github/");
}
