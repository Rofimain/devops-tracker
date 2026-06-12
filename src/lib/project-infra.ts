import { parseCostLineItems, type ProjectCostLineItem } from "@/lib/project-cost";

export type InfraFormRow = {
  envName: string;
  targetGroup: string;
  loadBalancer: string;
  serverIp: string;
  hosting: string[];
  cdn: string[];
  databases: string[];
  costItems?: ProjectCostLineItem[];
  costNotes?: string;
};

export const PRESET_ENVIRONMENTS = ["production", "staging", "development"];

export function emptyInfraRow(envName: string): InfraFormRow {
  return {
    envName,
    targetGroup: "",
    loadBalancer: "",
    serverIp: "",
    hosting: [],
    cdn: [],
    databases: [],
  };
}

export function orderInfraRows(rows: InfraFormRow[]): InfraFormRow[] {
  const presetOrder = ["production", "staging", "development"];
  return [...rows].sort((a, b) => {
    const la = a.envName.toLowerCase();
    const lb = b.envName.toLowerCase();
    const ia = presetOrder.indexOf(la);
    const ib = presetOrder.indexOf(lb);
    if (ia >= 0 && ib >= 0) return ia - ib;
    if (ia >= 0) return -1;
    if (ib >= 0) return 1;
    return a.envName.localeCompare(b.envName, undefined, { sensitivity: "base" });
  });
}

export function parseInfrasFromBody(body: unknown): InfraFormRow[] {
  const raw = (body as { infras?: unknown })?.infras;
  if (!Array.isArray(raw) || raw.length === 0) {
    return [emptyInfraRow("production")];
  }
  const mapped = raw.map((row: any, i: number) => ({
    envName: String(row?.envName ?? `env-${i}`).trim() || `env-${i}`,
    targetGroup: row?.targetGroup != null ? String(row.targetGroup) : "",
    loadBalancer: row?.loadBalancer != null ? String(row.loadBalancer) : "",
    serverIp: row?.serverIp != null ? String(row.serverIp) : "",
    hosting: Array.isArray(row?.hosting) ? row.hosting.map(String) : typeof row?.hosting === "string" ? row.hosting.split(",").map((s: string) => s.trim()).filter(Boolean) : [],
    cdn: Array.isArray(row?.cdn) ? row.cdn.map(String) : typeof row?.cdn === "string" ? row.cdn.split(",").map((s: string) => s.trim()).filter(Boolean) : [],
    databases: Array.isArray(row?.databases)
      ? row.databases.map(String)
      : typeof row?.databases === "string"
        ? row.databases.split(",").map((s: string) => s.trim()).filter(Boolean)
        : [],
    costItems: parseCostLineItems(row?.costItems),
    costNotes: row?.costNotes ? String(row.costNotes) : undefined,
  }));
  const byKey = new Map<string, InfraFormRow>();
  for (const row of mapped) {
    byKey.set(row.envName.toLowerCase(), row);
  }
  return orderInfraRows(Array.from(byKey.values()));
}
