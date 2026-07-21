import type { ClassEntry, Holiday, WorkSession } from "./types";

export const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;
export const DAY_FULL = [
  "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday",
] as const;

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
] as const;

export function uid(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36);
}

/* ---- local-time date helpers (dates are stored as YYYY-MM-DD keys) ---- */

export function toDateKey(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

export function parseDateKey(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function addDays(d: Date, n: number): Date {
  const out = new Date(d);
  out.setDate(out.getDate() + n);
  return out;
}

/** 0 = Monday … 6 = Sunday. */
export function weekdayIndex(d: Date): number {
  return (d.getDay() + 6) % 7;
}

export function minutesOf(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

export function formatDateKey(key: string): string {
  const d = parseDateKey(key);
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

export function formatDateKeyLong(key: string): string {
  const d = parseDateKey(key);
  return `${DAY_FULL[weekdayIndex(d)]}, ${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

/** Monday-first list of the 7 date keys of the week containing `now`. */
export function currentWeekDates(now = new Date()): string[] {
  const monday = addDays(startOfDay(now), -weekdayIndex(now));
  return Array.from({ length: 7 }, (_, i) => toDateKey(addDays(monday, i)));
}

export function holidaySet(holidays: Holiday[]): Set<string> {
  return new Set(holidays.map((h) => h.date));
}

/* ---- project timetable generation ---- */

/**
 * Spread `count` work sessions evenly across [start, end], skipping holidays
 * (and weekends when requested). Returns fewer sessions than asked when the
 * period doesn't have enough eligible days.
 */
export function generateSessions(opts: {
  start: string;
  end: string;
  count: number;
  holidays: Holiday[];
  skipWeekends: boolean;
}): WorkSession[] {
  const endD = parseDateKey(opts.end);
  const skip = holidaySet(opts.holidays);
  const days: string[] = [];
  for (let d = parseDateKey(opts.start); d <= endD; d = addDays(d, 1)) {
    const key = toDateKey(d);
    if (skip.has(key)) continue;
    if (opts.skipWeekends && weekdayIndex(d) >= 5) continue;
    days.push(key);
  }
  if (days.length === 0) return [];

  const n = Math.max(1, Math.min(opts.count, days.length));
  return Array.from({ length: n }, (_, i) => ({
    id: uid(),
    date: days[Math.floor((i * days.length) / n)],
    label: `Session ${i + 1} of ${n}`,
    done: false,
  }));
}

/* ---- class schedule queries ---- */

export function classesOnDay(classes: ClassEntry[], day: number): ClassEntry[] {
  return classes
    .filter((c) => c.day === day)
    .sort((a, b) => minutesOf(a.start) - minutesOf(b.start));
}

export interface UpcomingClass {
  cls: ClassEntry;
  date: string;
  startsAt: Date;
  minutesUntil: number;
}

/** The next class within a week that isn't on a holiday, or null. */
export function nextClass(
  classes: ClassEntry[],
  holidays: Holiday[],
  now = new Date()
): UpcomingClass | null {
  const skip = holidaySet(holidays);
  for (let offset = 0; offset <= 7; offset++) {
    const day = addDays(startOfDay(now), offset);
    const key = toDateKey(day);
    if (skip.has(key)) continue;
    for (const cls of classesOnDay(classes, weekdayIndex(day))) {
      const min = minutesOf(cls.start);
      const startsAt = new Date(day);
      startsAt.setHours(Math.floor(min / 60), min % 60, 0, 0);
      if (startsAt.getTime() > now.getTime()) {
        return {
          cls,
          date: key,
          startsAt,
          minutesUntil: Math.round((startsAt.getTime() - now.getTime()) / 60000),
        };
      }
    }
  }
  return null;
}
