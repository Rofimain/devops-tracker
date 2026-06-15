const WIB = "Asia/Jakarta";

export type MonthParts = { year: number; month: number };

const wibDateFmt = new Intl.DateTimeFormat("en-CA", { timeZone: WIB });
const wibHourFmt = new Intl.DateTimeFormat("en-GB", { timeZone: WIB, hour: "numeric", hour12: false });

/** Tanggal hari ini di WIB sebagai YYYY-MM-DD. */
export function todayWibDateKey(d = new Date()): string {
  return wibDateFmt.format(d);
}

/** Jam saat ini di WIB (0–23). */
export function wibHourNow(d = new Date()): number {
  return Number(wibHourFmt.format(d));
}

/** Sudah lewat jam 15:00 WIB (waktu autofill harian). */
export function isPastAutofillHourWib(d = new Date()): boolean {
  return wibHourNow(d) >= 15;
}

/** Parse ?month=2026-06 atau ?month=2026-06-15 → { year, month } (1-indexed). */
export function parseMonthParam(param?: string): MonthParts {
  const now = new Date();
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: WIB, year: "numeric", month: "numeric" })
    .formatToParts(now);
  const fallback: MonthParts = {
    year: Number(parts.find((p) => p.type === "year")?.value ?? 0),
    month: Number(parts.find((p) => p.type === "month")?.value ?? 0),
  };
  if (!param?.trim()) return fallback;

  const m = param.trim().match(/^(\d{4})-(\d{2})(?:-\d{2})?$/);
  if (!m) return fallback;

  const year = Number(m[1]);
  const month = Number(m[2]);
  if (year < 2000 || year > 2100 || month < 1 || month > 12) return fallback;
  return { year, month };
}

export function formatMonthParam({ year, month }: MonthParts): string {
  return `${year}-${String(month).padStart(2, "0")}`;
}

export function monthLabel({ year, month }: MonthParts): string {
  const d = new Date(Date.UTC(year, month - 1, 1));
  return new Intl.DateTimeFormat("id-ID", { timeZone: WIB, month: "long", year: "numeric" }).format(d);
}

export function addMonth({ year, month }: MonthParts, delta: number): MonthParts {
  const d = new Date(Date.UTC(year, month - 1 + delta, 1));
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1 };
}

/** YYYY-MM-DD → Date (midnight UTC, untuk kolom @db.Date). */
export function dateKeyToUtcDate(dateKey: string): Date {
  const [y, mo, d] = dateKey.split("-").map(Number);
  return new Date(Date.UTC(y, mo - 1, d));
}

/** Format tanggal seperti spreadsheet: "8 January 2026". */
export function formatActivityDateDisplay(date: Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "UTC",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

/** Rentang query Prisma untuk satu bulan kalender (UTC date). */
export function monthDateRange({ year, month }: MonthParts) {
  const start = new Date(Date.UTC(year, month - 1, 1));
  const end = new Date(Date.UTC(year, month, 0));
  return { gte: start, lte: end };
}
