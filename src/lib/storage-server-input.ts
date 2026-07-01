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

function normalizeNasInput(
  data: StorageServerInput,
  nasType: "SYNOLOGY" | "QNAP",
  password: string,
): { ok: true; value: NormalizedStorageServerInput } | { ok: false; error: string } {
  const name = data.name.trim();
  const customBase = (data.baseUrl ?? "").trim();
  let host = data.host.trim();
  const defaultHttps = data.useHttps ?? (nasType === "SYNOLOGY");
  let port = data.port ?? (nasType === "QNAP" ? (defaultHttps ? 443 : 8080) : defaultHttps ? 5001 : 5000);
  let useHttps = defaultHttps;
  let baseUrl = "";

  if (customBase) {
    const fromBase = parseStorageHostInput(customBase, undefined, undefined, nasType);
    if (!fromBase) {
      return { ok: false, error: `URL dasar ${nasType === "QNAP" ? "QNAP" : "Synology"} tidak valid` };
    }
    host = fromBase.host;
    port = fromBase.port;
    useHttps = fromBase.useHttps;
    baseUrl = customBase.replace(/\/$/, "");
  } else {
    const parsed = parseStorageHostInput(host, data.port, data.useHttps, nasType);
    if (!parsed) {
      return {
        ok: false,
        error: "IP publik, hostname, atau URL tidak valid",
      };
    }
    host = parsed.host;
    port = parsed.port;
    useHttps = parsed.useHttps;
  }

  if (!password) {
    return {
      ok: false,
      error: nasType === "QNAP" ? "Password QTS wajib untuk QNAP" : "Password DSM wajib untuk Synology",
    };
  }

  return {
    ok: true,
    value: {
      name,
      serverType: nasType,
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

export function normalizeStorageServerInput(
  data: StorageServerInput,
  existingPassword = "",
): { ok: true; value: NormalizedStorageServerInput } | { ok: false; error: string } {
  const name = data.name.trim();
  if (!name) return { ok: false, error: "Nama wajib diisi" };

  const password = data.password !== undefined ? data.password.trim() : existingPassword;

  if (data.serverType === "SYNOLOGY") {
    return normalizeNasInput(data, "SYNOLOGY", password);
  }

  if (data.serverType === "QNAP") {
    return normalizeNasInput(data, "QNAP", password);
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
