import type { StorageServerType } from "@prisma/client";
import { parseStorageHostInput, hostLabelFromApiUrl } from "@/lib/storage-endpoint";

export type StorageServerInput = {
  name: string;
  serverType: StorageServerType;
  host: string;
  port?: number;
  useHttps?: boolean;
  username?: string;
  password?: string;
  baseUrl?: string;
  apiUrl?: string;
  enabled?: boolean;
  sortOrder?: number;
  notes?: string | null;
};

export type NormalizedStorageServerInput = {
  name: string;
  serverType: StorageServerType;
  host: string;
  port: number;
  useHttps: boolean;
  username: string;
  password: string;
  baseUrl: string;
  apiUrl: string;
  enabled: boolean;
  sortOrder: number;
  notes: string | null;
};

export function normalizeStorageServerInput(
  data: StorageServerInput,
  existingPassword = "",
): { ok: true; value: NormalizedStorageServerInput } | { ok: false; error: string } {
  const name = data.name.trim();
  if (!name) return { ok: false, error: "Nama wajib diisi" };

  const password = data.password !== undefined ? data.password.trim() : existingPassword;

  if (data.serverType === "SYNOLOGY") {
    const customBase = (data.baseUrl ?? "").trim();
    let host = data.host.trim();
    let port = data.port ?? 5001;
    let useHttps = data.useHttps ?? true;
    let baseUrl = "";

    if (customBase) {
      const fromBase = parseStorageHostInput(customBase);
      if (!fromBase) return { ok: false, error: "URL dasar Synology tidak valid" };
      host = fromBase.host;
      port = fromBase.port;
      useHttps = fromBase.useHttps;
      baseUrl = customBase.replace(/\/$/, "");
    } else {
      const parsed = parseStorageHostInput(host, data.port, data.useHttps);
      if (!parsed) return { ok: false, error: "IP publik, hostname, atau URL DSM tidak valid" };
      host = parsed.host;
      port = parsed.port;
      useHttps = parsed.useHttps;
    }

    if (!password) return { ok: false, error: "Password DSM wajib untuk Synology" };

    return {
      ok: true,
      value: {
        name,
        serverType: "SYNOLOGY",
        host,
        port,
        useHttps,
        username: (data.username ?? "").trim(),
        password,
        baseUrl,
        apiUrl: "",
        enabled: data.enabled ?? true,
        sortOrder: data.sortOrder ?? 0,
        notes: data.notes?.trim() || null,
      },
    };
  }

  const apiUrl = (data.apiUrl ?? "").trim();
  if (!apiUrl) return { ok: false, error: "URL endpoint wajib untuk HTTP JSON" };

  let host = data.host.trim();
  if (!host) host = hostLabelFromApiUrl(apiUrl);
  if (!host) return { ok: false, error: "Label host atau URL endpoint wajib" };

  let port = data.port ?? 443;
  let useHttps = true;
  try {
    const u = new URL(apiUrl);
    port = u.port ? Number(u.port) : u.protocol === "https:" ? 443 : 80;
    useHttps = u.protocol === "https:";
  } catch {
    return { ok: false, error: "URL endpoint HTTP JSON tidak valid" };
  }

  return {
    ok: true,
    value: {
      name,
      serverType: "HTTP_JSON",
      host,
      port,
      useHttps,
      username: "",
      password: "",
      baseUrl: "",
      apiUrl,
      enabled: data.enabled ?? true,
      sortOrder: data.sortOrder ?? 0,
      notes: data.notes?.trim() || null,
    },
  };
}
