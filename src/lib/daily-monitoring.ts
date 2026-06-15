import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { dateKeyToUtcDate, todayWibDateKey } from "@/lib/monitoring-date";

export const MONITORING_CATEGORIES = ["Monitoring", "Monitoring and Optimize"] as const;
export const MONITORING_STATUSES = ["Done", "In Progress", "Pending"] as const;

export const monitoringEntrySchema = z.object({
  activityCategory: z.enum(MONITORING_CATEGORIES),
  activity: z.string().min(1).max(200),
  activityDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  application: z.string().min(1).max(300),
  status: z.enum(MONITORING_STATUSES).default("Done"),
});

export const monitoringPatchSchema = monitoringEntrySchema.partial();

export const AUTO_DAILY_ENTRY = {
  activityCategory: "Monitoring",
  activity: "Daily monitoring",
  application: "All Website Asset",
  status: "Done",
  source: "auto",
} as const;

/** Buat entri harian otomatis jika belum ada untuk tanggal WIB tersebut. Idempotent. */
export async function ensureAutoDailyMonitoringEntry(dateKey?: string) {
  const key = dateKey ?? todayWibDateKey();
  const activityDate = dateKeyToUtcDate(key);

  const existing = await prisma.devOpsMonitoringEntry.findFirst({
    where: {
      activityDate,
      source: AUTO_DAILY_ENTRY.source,
      activity: AUTO_DAILY_ENTRY.activity,
    },
  });

  if (existing) {
    return { created: false as const, entry: existing, dateKey: key };
  }

  const entry = await prisma.devOpsMonitoringEntry.create({
    data: {
      activityCategory: AUTO_DAILY_ENTRY.activityCategory,
      activity: AUTO_DAILY_ENTRY.activity,
      activityDate,
      application: AUTO_DAILY_ENTRY.application,
      status: AUTO_DAILY_ENTRY.status,
      source: AUTO_DAILY_ENTRY.source,
    },
  });

  return { created: true as const, entry, dateKey: key };
}
