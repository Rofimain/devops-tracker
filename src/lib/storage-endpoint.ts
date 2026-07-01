/** Normalisasi input host/URL untuk koneksi storage (IP lokal, IP publik, hostname, DDNS). */
export type ParsedStorageEndpoint = {
  host: string;
  port: number;
  useHttps: boolean;
  baseUrl: string;
};

function defaultNasPort(nasType: "SYNOLOGY" | "QNAP", useHttps: boolean): number {
  if (nasType === "QNAP") return useHttps ? 443 : 8080;
  return useHttps ? 5001 : 5000;
}

/** @deprecated gunakan defaultNasPort */
function defaultDsmPort(useHttps: boolean): number {
  return defaultNasPort("SYNOLOGY", useHttps);
}

/** Parse IP publik, IP lokal, hostname, atau URL lengkap. */
export function parseStorageHostInput(
  input: string,
  fallbackPort?: number,
  fallbackHttps?: boolean,
  nasType: "SYNOLOGY" | "QNAP" = "SYNOLOGY",
): ParsedStorageEndpoint | null {
  const raw = input.trim();
  if (!raw) return null;

  if (raw.includes("://")) {
    try {
      const u = new URL(raw);
      const useHttps = u.protocol === "https:";
      const port = u.port ? Number(u.port) : defaultNasPort(nasType, useHttps);
      if (!u.hostname) return null;
      return {
        host: u.hostname,
        port,
        useHttps,
        baseUrl: `${u.protocol}//${u.host}`,
      };
    } catch {
      return null;
    }
  }

  let host = raw;
  let port = fallbackPort ?? defaultNasPort(nasType, fallbackHttps ?? true);
  let useHttps = fallbackHttps ?? true;

  // host:port tanpa skema (203.0.113.10:5001 atau nas.synology.me:5001)
  const hostPortMatch = /^\[([^\]]+)\](?::(\d+))?$|^([^:/\s]+)(?::(\d+))?$/.exec(raw.split("/")[0] ?? raw);
  if (hostPortMatch) {
    host = (hostPortMatch[1] ?? hostPortMatch[3] ?? "").trim();
    const portStr = hostPortMatch[2] ?? hostPortMatch[4];
    if (portStr) port = Number(portStr);
  }

  if (!host) return null;

  const scheme = useHttps ? "https" : "http";
  const baseUrl = `${scheme}://${host.includes(":") ? `[${host}]` : host}${port ? `:${port}` : ""}`;

  return { host, port, useHttps, baseUrl };
}

export function resolveNasBaseUrl(server: {
  host: string;
  port: number;
  useHttps: boolean;
  baseUrl?: string | null;
  serverType?: "SYNOLOGY" | "QNAP";
}): string {
  const custom = server.baseUrl?.trim();
  if (custom) return custom.replace(/\/$/, "");

  const nasType = server.serverType ?? "SYNOLOGY";
  const parsed = parseStorageHostInput(server.host, server.port, server.useHttps, nasType);
  if (parsed) return parsed.baseUrl;

  const scheme = server.useHttps ? "https" : "http";
  const h = server.host.trim();
  const hostPart = h.includes(":") && !h.startsWith("[") ? `[${h}]` : h;
  return `${scheme}://${hostPart}:${server.port}`;
}

/** @deprecated gunakan resolveNasBaseUrl */
export function resolveSynologyBaseUrl(server: {
  host: string;
  port: number;
  useHttps: boolean;
  baseUrl?: string | null;
}): string {
  return resolveNasBaseUrl({ ...server, serverType: "SYNOLOGY" });
}

export function hostLabelFromApiUrl(apiUrl: string): string {
  try {
    return new URL(apiUrl.trim()).hostname;
  } catch {
    return apiUrl.trim().slice(0, 64);
  }
}
