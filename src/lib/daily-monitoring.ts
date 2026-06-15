import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { dateKeyToUtcDate, isPastCheck1WindowWib, isPastCheck2WindowWib, randomTimeInWibWindow, todayWibDateKey } from "@/lib/monitoring-date";

export const MANUAL_CATEGORIES = ["Optimize"] as const;
export const MONITORING_STATUSES = ["Done", "In Progress", "Pending"] as const;
export const DAILY_ROW_TYPE = "daily" as const;
export const OPTIMIZE_ROW_TYPE = "optimize" as const;

export const CHECK_SLOTS = {
  1: { startHour: 11, endHour: 12, windowLabel: "11:00–12:00 WIB" },
  2: { startHour: 20, endHour: 21, windowLabel: "20:00–21:00 WIB" },
} as const;

export type CheckSlot = keyof typeof CHECK_SLOTS;

export const monitoringEntrySchema = z.object({
  activityCategory: z.literal("Optimize"),
  activity: z.string().min(1).max(200),
  activityDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  application: z.string().min(1).max(300),
  status: z.enum(MONITORING_STATUSES).default("Done"),
});

export const monitoringPatchSchema = monitoringEntrySchema.partial();

export const AUTO_DAILY_ROW = {
  rowType: DAILY_ROW_TYPE,
  activityCategory: "Monitoring",
  activity: "Daily monitoring",
  application: "All Website Asset",
  status: "Done",
  source: "auto",
} as const;

function checkFields(slot: CheckSlot) {
  return slot === 1
    ? ({ at: "check1At", status: "check1Status" } as const)
    : ({ at: "check2At", status: "check2Status" } as const);
}

/** Isi daily checking otomatis (random dalam rentang jam WIB). Idempotent per slot. */
export async function ensureDailyCheck(slot: CheckSlot, dateKey?: string) {
  const key = dateKey ?? todayWibDateKey();
  const activityDate = dateKeyToUtcDate(key);
  const { at, status } = checkFields(slot);
  const window = CHECK_SLOTS[slot];
  const checkAt = randomTimeInWibWindow(key, window.startHour, window.endHour);

  const existing = await prisma.devOpsMonitoringEntry.findUnique({
    where: { dailyDateKey: key },
  });

  if (existing?.[status] === "Done") {
    return { created: false as const, entry: existing, dateKey: key, slot };
  }

  const entry = await prisma.devOpsMonitoringEntry.upsert({
    where: { dailyDateKey: key },
    create: {
      ...AUTO_DAILY_ROW,
      activityDate,
      dailyDateKey: key,
      check1Status: slot === 1 ? "Done" : "Pending",
      check2Status: slot === 2 ? "Done" : "Pending",
      check1At: slot === 1 ? checkAt : null,
      check2At: slot === 2 ? checkAt : null,
    },
    update: {
      [at]: checkAt,
      [status]: "Done",
    },
  });

  return { created: !existing, entry, dateKey: key, slot };
}

/** Fallback halaman: isi semua slot yang sudah lewat jendela waktunya. */
export async function ensureDueDailyChecks(dateKey?: string) {
  const results = [];
  if (isPastCheck1WindowWib()) results.push(await ensureDailyCheck(1, dateKey));
  if (isPastCheck2WindowWib()) results.push(await ensureDailyCheck(2, dateKey));
  return results;
}
