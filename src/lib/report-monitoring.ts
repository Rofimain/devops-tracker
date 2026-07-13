import { z } from "zod";

export type MonitoringCheckPeriod = "MONTHLY" | "QUARTERLY" | "SEMIANNUALLY" | "YEARLY";

export const PERIOD_LABELS: Record<MonitoringCheckPeriod, string> = {
  MONTHLY: "Monthly",
  QUARTERLY: "Quarterly",
  SEMIANNUALLY: "Semiannually",
  YEARLY: "Yearly",
};

export const PERIOD_OPTIONS: { value: MonitoringCheckPeriod; label: string }[] = [
  { value: "MONTHLY", label: "Monthly" },
  { value: "QUARTERLY", label: "Quarterly" },
  { value: "SEMIANNUALLY", label: "Semiannually" },
  { value: "YEARLY", label: "Yearly" },
];

const MONTH_NAMES_ID = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

const MONTH_SHORT_ID = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

/** Bulan (1–12) yang wajib diisi untuk period tertentu. */
export function monthsForPeriod(period: MonitoringCheckPeriod): number[] {
  switch (period) {
    case "MONTHLY":
      return [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
    case "QUARTERLY":
      return [1, 4, 7, 10];
    case "SEMIANNUALLY":
      return [1, 7];
    case "YEARLY":
      return [1];
    default:
      return [1];
  }
}

export function monthShortLabel(month: number): string {
  return MONTH_SHORT_ID[month - 1] ?? String(month);
}

export function monthFullLabel(month: number): string {
  return MONTH_NAMES_ID[month - 1] ?? String(month);
}

export function formatCheckDateDisplay(date: Date | string | null | undefined): string {
  if (!date) return "";
  const d = typeof date === "string" ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return "";
  const day = d.getUTCDate();
  const month = MONTH_NAMES_ID[d.getUTCMonth()] ?? "";
  const year = d.getUTCFullYear();
  return `${day} ${month} ${year}`;
}

export function parseYearParam(raw?: string | null): number {
  const now = new Date();
  const y = raw ? Number.parseInt(raw, 10) : now.getFullYear();
  if (!Number.isFinite(y) || y < 2000 || y > 2100) return now.getFullYear();
  return y;
}

/** Kolom bulan yang ditampilkan: union dari period semua service (sorted). */
export function displayMonthsForServices(periods: MonitoringCheckPeriod[]): number[] {
  const set = new Set<number>();
  for (const p of periods) {
    for (const m of monthsForPeriod(p)) set.add(m);
  }
  if (set.size === 0) {
    return [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
  }
  return Array.from(set).sort((a, b) => a - b);
}

export function isMonthApplicable(period: MonitoringCheckPeriod, month: number): boolean {
  return monthsForPeriod(period).includes(month);
}

export const serviceCreateSchema = z.object({
  name: z.string().trim().min(1, "Nama service wajib diisi").max(200),
  period: z.enum(["MONTHLY", "QUARTERLY", "SEMIANNUALLY", "YEARLY"]),
  sortOrder: z.number().int().optional(),
});

export const serviceUpdateSchema = z.object({
  name: z.string().trim().min(1).max(200).optional(),
  period: z.enum(["MONTHLY", "QUARTERLY", "SEMIANNUALLY", "YEARLY"]).optional(),
  sortOrder: z.number().int().optional(),
});

export const checkUpsertSchema = z.object({
  year: z.number().int().min(2000).max(2100),
  month: z.number().int().min(1).max(12),
  checkedAt: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Format tanggal YYYY-MM-DD")
    .nullable()
    .optional(),
  noteText: z.string().max(5000).nullable().optional(),
  clearImage: z.boolean().optional(),
});

export function dateKeyToUtcDate(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}
