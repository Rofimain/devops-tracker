import https from "https";
import axios, { type AxiosInstance } from "axios";
import type { StorageServer } from "@prisma/client";
import type { StorageUsageResult, StorageVolumeInfo } from "@/lib/storage-types";
import { resolveNasBaseUrl } from "@/lib/storage-endpoint";

const REQUEST_TIMEOUT_MS = 20_000;

function extractXmlTag(xml: string, tag: string): string | null {
  const cdata = new RegExp(`<${tag}><!\\[CDATA\\[([^\\]]*)\\]\\]></${tag}>`, "i").exec(xml);
  if (cdata?.[1] != null) return cdata[1].trim();
  const plain = new RegExp(`<${tag}>([^<]*)</${tag}>`, "i").exec(xml);
  return plain?.[1]?.trim() ?? null;
}

function extractXmlBlocks(xml: string, tag: string): string[] {
  const re = new RegExp(`<${tag}>[\\s\\S]*?</${tag}>`, "gi");
  return xml.match(re) ?? [];
}

function parseSizeToBytes(raw: string | null | undefined): number {
  if (!raw) return 0;
  const n = Number(raw.trim());
  if (!Number.isFinite(n) || n <= 0) return 0;
  // chartReq biasanya bytes; nilai kecil kemungkinan MB (firmware lama)
  if (n < 10_000_000) return Math.round(n * 1024 * 1024);
  return Math.round(n);
}

function qnapEncodedPassword(password: string): string {
  return Buffer.from(password, "utf-8").toString("base64");
}

function createClient(server: Pick<StorageServer, "host" | "port" | "useHttps" | "baseUrl">): AxiosInstance {
  const baseURL = `${resolveNasBaseUrl({ ...server, serverType: "QNAP" })}/cgi-bin`;
  const useTls = baseURL.startsWith("https://");
  return axios.create({
    baseURL,
    timeout: REQUEST_TIMEOUT_MS,
    httpsAgent: useTls ? new https.Agent({ rejectUnauthorized: false }) : undefined,
    validateStatus: () => true,
    headers: { Accept: "text/xml, application/xml, */*" },
  });
}

async function login(client: AxiosInstance, username: string, password: string): Promise<string> {
  const user = username.trim();
  const pass = password.trim();
  let lastErr = "Login QNAP gagal";

  const attempts: Array<{ method: "get" | "post"; params?: Record<string, string>; data?: Record<string, string> }> = [
    { method: "get", params: { user, plain_pwd: pass, serviceKey: "1" } },
    { method: "get", params: { user, pwd: qnapEncodedPassword(pass), serviceKey: "1" } },
    { method: "post", data: { user, pwd: qnapEncodedPassword(pass) } },
  ];

  for (const attempt of attempts) {
    const res =
      attempt.method === "get"
        ? await client.get("/authLogin.cgi", { params: attempt.params })
        : await client.post("/authLogin.cgi", attempt.data);

    const body = typeof res.data === "string" ? res.data : JSON.stringify(res.data ?? "");
    const authPassed = extractXmlTag(body, "authPassed");
    const sid = extractXmlTag(body, "authSid");

    if (authPassed === "0") {
      lastErr = "Akun atau password QNAP salah";
      continue;
    }
    if (sid) return sid;
  }

  throw new Error(lastErr);
}

async function logout(client: AxiosInstance, sid: string): Promise<void> {
  try {
    await client.get("/authLogout.cgi", { params: { sid } });
  } catch {
    /* ignore */
  }
}

function parseQnapVolumesXml(xml: string): StorageVolumeInfo[] {
  const labelById = new Map<string, string>();
  for (const block of extractXmlBlocks(xml, "volume")) {
    const id = extractXmlTag(block, "volumeValue");
    const label = extractXmlTag(block, "volumeLabel");
    if (id) labelById.set(id, label ?? `Volume ${id}`);
  }

  const volumes: StorageVolumeInfo[] = [];
  for (const block of extractXmlBlocks(xml, "volumeUse")) {
    const id = extractXmlTag(block, "volumeValue");
    const name = (id && labelById.get(id)) || extractXmlTag(block, "volumeLabel") || (id ? `Volume ${id}` : "Volume");
    const totalBytes = parseSizeToBytes(extractXmlTag(block, "total_size"));
    const freeBytes = parseSizeToBytes(extractXmlTag(block, "free_size"));
    if (totalBytes <= 0) continue;
    const usedBytes = Math.max(0, totalBytes - (freeBytes > 0 ? freeBytes : 0));
    volumes.push({
      name,
      totalBytes,
      usedBytes,
      status: extractXmlTag(block, "volume_status") ?? undefined,
    });
  }

  return volumes;
}

async function fetchVolumes(client: AxiosInstance, sid: string): Promise<StorageVolumeInfo[]> {
  const res = await client.get("/management/chartReq.cgi", {
    params: {
      chart_func: "disk_usage",
      disk_select: "all",
      include: "all",
      sid,
    },
  });

  const body = typeof res.data === "string" ? res.data : "";
  if (!body.includes("QDocRoot") && res.status >= 400) {
    throw new Error(`QNAP API HTTP ${res.status}`);
  }

  const volumes = parseQnapVolumesXml(body);
  if (volumes.length === 0) throw new Error("Tidak ada volume storage yang terdeteksi dari QNAP");
  return volumes;
}

async function fetchSystemInfo(client: AxiosInstance, sid: string): Promise<StorageUsageResult["system"]> {
  const res = await client.get("/management/manaRequest.cgi", {
    params: { subfunc: "sysinfo", hd: "no", sid },
  });
  const body = typeof res.data === "string" ? res.data : "";
  const model = extractXmlTag(body, "displayModelName") ?? extractXmlTag(body, "modelName");
  const version = extractXmlTag(body, "version");
  return {
    model: model ?? undefined,
    version: version ?? undefined,
  };
}

export async function fetchQnapStorageUsage(server: StorageServer): Promise<StorageUsageResult> {
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
      error: "Username/password QTS belum dikonfigurasi",
      fetchedAt: new Date().toISOString(),
      volumes: [],
    };
  }

  const client = createClient(server);
  let sid: string | undefined;

  try {
    sid = await login(client, server.username, server.password);
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
    const msg = e instanceof Error ? e.message : "Gagal menghubungi QNAP";
    const hint =
      msg.includes("ECONNREFUSED") || msg.includes("ENOTFOUND") || msg.includes("ETIMEDOUT")
        ? `${msg} — pastikan server web bisa menjangkau IP/hostname QNAP (publik atau VPN), port QTS terbuka`
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
