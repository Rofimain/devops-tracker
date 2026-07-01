import https from "https";
import axios, { type AxiosInstance } from "axios";
import type { StorageServer } from "@prisma/client";
import type { StorageUsageResult, StorageVolumeInfo } from "@/lib/storage-types";
import { resolveSynologyBaseUrl } from "@/lib/storage-endpoint";

const AUTH_VERSIONS = [7, 6, 3] as const;
const REQUEST_TIMEOUT_MS = 20_000;

function parseByteField(v: unknown): number {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return 0;
}

function createClient(server: Pick<StorageServer, "host" | "port" | "useHttps" | "baseUrl">): AxiosInstance {
  const baseURL = resolveSynologyBaseUrl(server);
  const useTls = baseURL.startsWith("https://");
  const httpsAgent = useTls ? new https.Agent({ rejectUnauthorized: false }) : undefined;

  return axios.create({
    baseURL,
    timeout: REQUEST_TIMEOUT_MS,
    httpsAgent,
    validateStatus: () => true,
  });
}

type DsmResponse<T = Record<string, unknown>> = {
  success?: boolean;
  data?: T;
  error?: { code?: number };
};

async function dsmGet<T = Record<string, unknown>>(
  client: AxiosInstance,
  path: string,
  params: Record<string, string | number | undefined>,
  sid?: string,
): Promise<DsmResponse<T>> {
  const res = await client.get(path, {
    params: { ...params, ...(sid ? { _sid: sid } : {}) },
  });
  if (typeof res.data !== "object" || res.data === null) {
    throw new Error(`Respons tidak valid (HTTP ${res.status})`);
  }
  return res.data as DsmResponse<T>;
}

async function login(client: AxiosInstance, username: string, password: string): Promise<string> {
  let lastErr = "Login gagal";
  for (const version of AUTH_VERSIONS) {
    const res = await dsmGet<{ sid?: string }>(client, "/webapi/auth.cgi", {
      api: "SYNO.API.Auth",
      version,
      method: "login",
      account: username,
      passwd: password,
      session: "StorageMonitor",
      format: "sid",
    });
    if (res.success && res.data?.sid) return res.data.sid;
    if (res.error?.code === 400) lastErr = "Akun atau password salah";
    else if (res.error?.code === 403) lastErr = "Akun tidak punya izin DSM API";
    else if (res.error?.code === 402) lastErr = "DSM membutuhkan OTP/2FA — gunakan akun khusus tanpa 2FA";
  }
  throw new Error(lastErr);
}

async function logout(client: AxiosInstance, sid: string): Promise<void> {
  try {
    await dsmGet(client, "/webapi/auth.cgi", {
      api: "SYNO.API.Auth",
      version: 6,
      method: "logout",
      session: "StorageMonitor",
      _sid: sid,
    });
  } catch {
    /* ignore */
  }
}

function mapCoreVolumes(data: Record<string, unknown>): StorageVolumeInfo[] {
  const raw = data.volumes;
  if (!Array.isArray(raw)) return [];

  return raw.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const v = item as Record<string, unknown>;
    const total = parseByteField(v.size_total_byte);
    const free = parseByteField(v.size_free_byte);
    const used = total > 0 ? Math.max(0, total - free) : 0;
    const name = String(v.display_name ?? v.volume_path ?? `Volume ${v.volume_id ?? ""}`).trim();
    if (!name || total <= 0) return [];
    return [
      {
        name,
        path: typeof v.volume_path === "string" ? v.volume_path : undefined,
        status: typeof v.status === "string" ? v.status : undefined,
        totalBytes: total,
        usedBytes: used,
        fsType: typeof v.fs_type === "string" ? v.fs_type : undefined,
      },
    ];
  });
}

function mapCgiVolumes(data: Record<string, unknown>): StorageVolumeInfo[] {
  const volumes: StorageVolumeInfo[] = [];

  const pools = data.volumes ?? data.detected_pools ?? data.pools;
  if (Array.isArray(pools)) {
    for (const item of pools) {
      if (!item || typeof item !== "object") continue;
      const v = item as Record<string, unknown>;
      const total = parseByteField(v.size_total_byte ?? v.total_size ?? v.size);
      const used = parseByteField(v.size_used_byte ?? v.used_size ?? v.used);
      const free = parseByteField(v.size_free_byte ?? v.free_size ?? v.free);
      const usedBytes = used > 0 ? used : total > 0 && free > 0 ? Math.max(0, total - free) : 0;
      const name = String(v.display_name ?? v.name ?? v.vol_desc ?? v.id ?? "Volume").trim();
      if (total <= 0) continue;
      volumes.push({
        name,
        path: typeof v.volume_path === "string" ? v.volume_path : typeof v.path === "string" ? v.path : undefined,
        status: typeof v.status === "string" ? v.status : undefined,
        totalBytes: total,
        usedBytes: usedBytes,
        fsType: typeof v.fs_type === "string" ? v.fs_type : undefined,
      });
    }
  }

  return volumes;
}

async function fetchVolumes(client: AxiosInstance, sid: string): Promise<StorageVolumeInfo[]> {
  const core = await dsmGet<Record<string, unknown>>(client, "/webapi/entry.cgi", {
    api: "SYNO.Core.Storage.Volume",
    version: 1,
    method: "list",
    limit: -1,
    offset: 0,
    location: "internal",
  }, sid);

  if (core.success && core.data) {
    const mapped = mapCoreVolumes(core.data);
    if (mapped.length > 0) return mapped;
  }

  const cgi = await dsmGet<Record<string, unknown>>(client, "/webapi/entry.cgi", {
    api: "SYNO.Storage.CGI.Storage",
    version: 1,
    method: "load_info",
  }, sid);

  if (!cgi.success || !cgi.data) {
    const code = cgi.error?.code;
    throw new Error(code ? `DSM API error ${code}` : "Gagal membaca info storage dari DSM");
  }

  const mapped = mapCgiVolumes(cgi.data);
  if (mapped.length === 0) throw new Error("Tidak ada volume storage yang terdeteksi");
  return mapped;
}

async function fetchSystemInfo(client: AxiosInstance, sid: string): Promise<StorageUsageResult["system"]> {
  const res = await dsmGet<Record<string, unknown>>(client, "/webapi/entry.cgi", {
    api: "SYNO.DSM.Info",
    version: 2,
    method: "getinfo",
  }, sid);

  if (!res.success || !res.data) return undefined;
  const d = res.data;
  return {
    model: typeof d.model === "string" ? d.model : undefined,
    serial: typeof d.serial === "string" ? d.serial : undefined,
    version: typeof d.version_string === "string" ? d.version_string : undefined,
    uptime: typeof d.uptime === "number" ? d.uptime : undefined,
  };
}

export async function fetchSynologyStorageUsage(server: StorageServer): Promise<StorageUsageResult> {
  const base: Omit<StorageUsageResult, "ok" | "volumes" | "fetchedAt"> = {
    serverId: server.id,
    serverName: server.name,
    serverType: server.serverType,
    host: server.host,
    port: server.port,
  };

  if (!server.username.trim() || !server.password.trim()) {
    return {
      ...base,
      ok: false,
      error: "Username/password DSM belum dikonfigurasi",
      fetchedAt: new Date().toISOString(),
      volumes: [],
    };
  }

  const client = createClient(server);
  let sid: string | undefined;

  try {
    sid = await login(client, server.username.trim(), server.password);
    const [volumes, system] = await Promise.all([
      fetchVolumes(client, sid),
      fetchSystemInfo(client, sid).catch(() => undefined),
    ]);

    return {
      ...base,
      ok: true,
      fetchedAt: new Date().toISOString(),
      volumes,
      system,
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Gagal menghubungi Synology";
    const hint =
      msg.includes("ECONNREFUSED") || msg.includes("ENOTFOUND") || msg.includes("ETIMEDOUT")
        ? `${msg} — pastikan server web bisa menjangkau IP/hostname NAS (publik atau VPN), port DSM terbuka di firewall/router`
        : msg;
    return {
      ...base,
      ok: false,
      error: hint,
      fetchedAt: new Date().toISOString(),
      volumes: [],
    };
  } finally {
    if (sid) await logout(client, sid);
  }
}
