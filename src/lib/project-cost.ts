import { getPresetById } from "@/lib/project-cost-catalog";

export type ProjectCostLineItem = {
  presetId: string;
  label: string;
  category: string;
  provider: string;
  quantity: number;
  monthlyUsd: number;
  notes?: string;
};

export type InfraCostRow = {
  envName: string;
  costItems: ProjectCostLineItem[];
  costNotes?: string;
};

export function emptyCostLineItem(): ProjectCostLineItem {
  return {
    presetId: "custom",
    label: "",
    category: "other",
    provider: "AWS",
    quantity: 1,
    monthlyUsd: 0,
  };
}

export function lineItemFromPreset(presetId: string, quantity = 1): ProjectCostLineItem | null {
  const preset = getPresetById(presetId);
  if (!preset) return null;
  return {
    presetId: preset.id,
    label: preset.label,
    category: preset.category,
    provider: preset.provider,
    quantity,
    monthlyUsd: preset.monthlyUsd,
  };
}

export function parseCostLineItems(raw: unknown): ProjectCostLineItem[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item: any) => ({
      presetId: String(item?.presetId ?? "custom"),
      label: String(item?.label ?? "").trim(),
      category: String(item?.category ?? "other"),
      provider: String(item?.provider ?? "AWS"),
      quantity: Math.max(0, Number(item?.quantity) || 0),
      monthlyUsd: Math.max(0, Number(item?.monthlyUsd) || 0),
      notes: item?.notes ? String(item.notes) : undefined,
    }))
    .filter((item) => item.label || item.monthlyUsd > 0);
}

export function lineItemSubtotal(item: ProjectCostLineItem): number {
  return item.quantity * item.monthlyUsd;
}

export function sumCostItems(items: ProjectCostLineItem[]): number {
  return items.reduce((sum, item) => sum + lineItemSubtotal(item), 0);
}

export function formatUsd(amount: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 }).format(amount);
}

export function formatProjectCostSummary(totalUsd: number): string {
  if (totalUsd <= 0) return "";
  return `${formatUsd(totalUsd)}/mo (est.)`;
}

export function parseInfraCostsFromBody(body: unknown): InfraCostRow[] {
  const raw = (body as { costs?: unknown })?.costs;
  if (!Array.isArray(raw)) return [];
  return raw.map((row: any) => ({
    envName: String(row?.envName ?? "").trim(),
    costItems: parseCostLineItems(row?.costItems),
    costNotes: row?.costNotes ? String(row.costNotes) : undefined,
  })).filter((r) => r.envName);
}
