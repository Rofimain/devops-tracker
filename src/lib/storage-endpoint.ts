/** Normalisasi input host/URL untuk koneksi storage (IP lokal, IP publik, hostname, DDNS). */
export type ParsedStorageEndpoint = {
  host: string;
  port: number;
  useHttps: boolean;
  baseUrl: string;
};

function defaultDsmPort(useHttps: boolean): number {
  return useHttps ? 5001 : 5000;
}

/** Parse IP publik, IP lokal, hostname, atau URL lengkap (https://nas.example.com:5001). */
export function parseStorageHostInput(
  input: string,
  fallbackPort?: number,
  fallbackHttps?: boolean,
): ParsedStorageEndpoint | null {
  const raw = input.trim();
  if (!raw) return null;

  if (raw.includes("://")) {
    try {
      const u = new URL(raw);
      const useHttps = u.protocol === "https:";
      const port = u.port ? Number(u.port) : defaultDsmPort(useHttps);
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
  let port = fallbackPort ?? defaultDsmPort(fallbackHttps ?? true);
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

export function resolveSynologyBaseUrl(server: {
  host: string;
  port: number;
  useHttps: boolean;
  baseUrl?: string | null;
}): string {
  const custom = server.baseUrl?.trim();
  if (custom) return custom.replace(/\/$/, "");

  const parsed = parseStorageHostInput(server.host, server.port, server.useHttps);
  if (parsed) return parsed.baseUrl;

  const scheme = server.useHttps ? "https" : "http";
  const h = server.host.trim();
  const hostPart = h.includes(":") && !h.startsWith("[") ? `[${h}]` : h;
  return `${scheme}://${hostPart}:${server.port}`;
}

export function hostLabelFromApiUrl(apiUrl: string): string {
  try {
    return new URL(apiUrl.trim()).hostname;
  } catch {
    return apiUrl.trim().slice(0, 64);
  }
}
