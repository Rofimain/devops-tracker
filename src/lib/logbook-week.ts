import { endOfISOWeek, format, getISOWeek, getISOWeekYear, setISOWeek, setISOWeekYear, startOfISOWeek } from "date-fns";

export type IsoWeek = { isoYear: number; isoWeek: number };

export function parseWeekParam(param?: string | null): IsoWeek {
  if (param && /^\d{4}-W\d{1,2}$/i.test(param)) {
    const m = param.match(/^(\d{4})-W(\d{1,2})$/i)!;
    const isoYear = parseInt(m[1], 10);
    const isoWeek = parseInt(m[2], 10);
    if (isoWeek >= 1 && isoWeek <= 53) return { isoYear, isoWeek };
  }
  const now = new Date();
  return { isoYear: getISOWeekYear(now), isoWeek: getISOWeek(now) };
}

export function formatWeekParam(w: IsoWeek) {
  return `${w.isoYear}-W${String(w.isoWeek).padStart(2, "0")}`;
}

function anchorDate(w: IsoWeek) {
  let d = new Date(w.isoYear, 5, 15);
  d = setISOWeekYear(d, w.isoYear);
  return setISOWeek(d, w.isoWeek);
}

export function weekLabel(w: IsoWeek) {
  try {
    const mid = anchorDate(w);
    const rangeStart = startOfISOWeek(mid);
    const rangeEnd = endOfISOWeek(mid);
    return `${format(rangeStart, "d MMM")} – ${format(rangeEnd, "d MMM yyyy")}`;
  } catch {
    return `Minggu ${w.isoWeek} · ${w.isoYear}`;
  }
}

export function addIsoWeek(w: IsoWeek, delta: number): IsoWeek {
  const mid = anchorDate(w);
  mid.setDate(mid.getDate() + delta * 7);
  return { isoYear: getISOWeekYear(mid), isoWeek: getISOWeek(mid) };
}

export const LOGBOOK_CATEGORIES = [
  { id: "deployment", label: "Deployment", accent: "accent" as const },
  { id: "change", label: "Change", accent: "purple" as const },
  { id: "incident", label: "Insiden", accent: "red" as const },
  { id: "maintenance", label: "Maintenance", accent: "yellow" as const },
  { id: "note", label: "Catatan", accent: "muted" as const },
] as const;

export type LogbookCategoryId = (typeof LOGBOOK_CATEGORIES)[number]["id"];
