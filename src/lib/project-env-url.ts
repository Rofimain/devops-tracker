import { normalizeExternalUrl, displayExternalUrl } from "@/lib/external-url";

export function envUrlLabel(envName: string): string {
  const key = envName.trim().toLowerCase();
  if (key === "production") return "URL (Production)";
  if (key === "staging") return "URL (Staging)";
  if (key === "development" || key === "dev") return "URL (Development)";
  const cap = envName.charAt(0).toUpperCase() + envName.slice(1);
  return `URL (${cap})`;
}

export function resolveInfraUrl(
  envName: string,
  infraUrl: string | null | undefined,
  projectUrl: string | null | undefined
): string | null {
  const fromInfra = normalizeExternalUrl(infraUrl ?? "");
  if (fromInfra) return fromInfra;
  if (envName.trim().toLowerCase() === "production") {
    return normalizeExternalUrl(projectUrl ?? "");
  }
  return null;
}

export { displayExternalUrl, normalizeExternalUrl };
