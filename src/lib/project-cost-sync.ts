import { Prisma } from "@prisma/client";
import { formatProjectCostSummary, parseCostLineItems, sumCostItems } from "@/lib/project-cost";
import type { InfraFormRow } from "@/lib/project-infra";

export function infraCostItemsToJson(items: unknown): Prisma.InputJsonValue | typeof Prisma.DbNull {
  const parsed = Array.isArray(items) && items.length && typeof items[0] === "object" && "presetId" in (items[0] as object)
    ? (items as InfraFormRow["costItems"])
    : parseCostLineItems(items);
  if (!parsed || parsed.length === 0) return Prisma.DbNull;
  return parsed as Prisma.InputJsonValue;
}

export function totalProjectCostUsd(infras: { costItems?: unknown }[]): number {
  return infras.reduce((sum, inf) => sum + sumCostItems(parseCostLineItems(inf.costItems)), 0);
}

export function projectCostPerMonthFromInfras(infras: { costItems?: unknown }[]): string | null {
  const total = totalProjectCostUsd(infras);
  if (total <= 0) return null;
  return formatProjectCostSummary(total);
}
