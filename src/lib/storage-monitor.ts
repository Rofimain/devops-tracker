import https from "https";
import axios from "axios";
import type { StorageServer } from "@prisma/client";
import type { HttpJsonStoragePayload, StorageUsageResult, StorageVolumeInfo } from "@/lib/storage-types";
import { fetchSynologyStorageUsage } from "@/lib/synology-dsm";

const REQUEST_TIMEOUT_MS = 15_000;

function parseHttpJsonVolumes(payload: HttpJsonStoragePayload): StorageVolumeInfo[] {
  if (!Array.isArray(payload.volumes)) return [];

  return payload.volumes.flatMap((v) => {
    const total = Number(v.totalBytes ?? 0);
    let used = Number(v.usedBytes ?? 0);
    if (used <= 0 && total > 0 && v.freeBytes != null) {
      used = Math.max(0, total - Number(v.freeBytes));
    }
    const name = (v.name ?? v.path ?? "Volume").trim();
    if (!name || total <= 0) return [];
    return [
      {
        name,
        path: v.path,
        status: v.status,
        totalBytes: total,
        usedBytes: used,
        fsType: v.fsType,
      },
    ];
  });
}

async function fetchHttpJsonStorageUsage(server: StorageServer): Promise<StorageUsageResult> {
  const base: Omit<StorageUsageResult, "ok" | "volumes" | "fetchedAt"> = {
    serverId: server.id,
    serverName: server.name,
    serverType: server.serverType,
    host: server.host,
    port: server.port,
  };

  const url = server.apiUrl.trim();
  if (!url) {
    return {
      ...base,
      ok: false,
      error: "URL endpoint HTTP belum dikonfigurasi",
      fetchedAt: new Date().toISOString(),
      volumes: [],
    };
  }

  try {
    const isHttps = url.startsWith("https://");
    const res = await axios.get<HttpJsonStoragePayload>(url, {
      timeout: REQUEST_TIMEOUT_MS,
      validateStatus: () => true,
      httpsAgent: isHttps ? new https.Agent({ rejectUnauthorized: false }) : undefined,
      headers: { Accept: "application/json" },
    });

    if (res.status < 200 || res.status >= 300) {
      return {
        ...base,
        ok: false,
        error: `HTTP ${res.status} dari endpoint`,
        fetchedAt: new Date().toISOString(),
        volumes: [],
      };
    }

    const volumes = parseHttpJsonVolumes(res.data ?? {});
    if (volumes.length === 0) {
      return {
        ...base,
        ok: false,
        error: "JSON valid tetapi tidak ada volume (field volumes kosong)",
        fetchedAt: new Date().toISOString(),
        volumes: [],
      };
    }

    return {
      ...base,
      ok: true,
      fetchedAt: new Date().toISOString(),
      volumes,
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Gagal fetch endpoint HTTP";
    return {
      ...base,
      ok: false,
      error: msg,
      fetchedAt: new Date().toISOString(),
      volumes: [],
    };
  }
}

export async function fetchStorageUsage(server: StorageServer): Promise<StorageUsageResult> {
  if (!server.enabled) {
    return {
      serverId: server.id,
      serverName: server.name,
      serverType: server.serverType,
      host: server.host,
      port: server.port,
      ok: false,
      error: "Server dinonaktifkan",
      fetchedAt: new Date().toISOString(),
      volumes: [],
    };
  }

  if (server.serverType === "HTTP_JSON") {
    return fetchHttpJsonStorageUsage(server);
  }

  return fetchSynologyStorageUsage(server);
}

export async function fetchAllStorageUsage(servers: StorageServer[]): Promise<StorageUsageResult[]> {
  const enabled = servers.filter((s) => s.enabled);
  return Promise.all(enabled.map((s) => fetchStorageUsage(s)));
}

export function serializeStorageServer(server: StorageServer) {
  return {
    id: server.id,
    name: server.name,
    serverType: server.serverType,
    host: server.host,
    port: server.port,
    useHttps: server.useHttps,
    username: server.username,
    hasPassword: Boolean(server.password.trim()),
    baseUrl: server.baseUrl,
    apiUrl: server.apiUrl,
    enabled: server.enabled,
    sortOrder: server.sortOrder,
    notes: server.notes,
    createdAt: server.createdAt.toISOString(),
    updatedAt: server.updatedAt.toISOString(),
  };
}

export type SerializedStorageServer = ReturnType<typeof serializeStorageServer>;
