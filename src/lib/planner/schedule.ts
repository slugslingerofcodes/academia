import type { ClassEntry, ClassException, Holiday, WorkSession } from "./types";

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

/** Study window a suggested session is allowed to fall in. */
const STUDY_START = 8 * 60;
const STUDY_END = 22 * 60;
const MIN_SESSION = 45;
const MAX_SESSION = 120;

/** Total minutes of class on a given weekday. */
export function classLoadOn(classes: ClassEntry[], day: number): number {
  return classes
    .filter((c) => c.day === day)
    .reduce((sum, c) => sum + (minutesOf(c.end) - minutesOf(c.start)), 0);
}

/**
 * The longest stretch of a weekday with no class, inside the study window.
 * Returns null when the day has no usable gap.
 */
export function freeWindowOn(
  classes: ClassEntry[],
  day: number
): { start: string; end: string } | null {
  const busy = classesOnDay(classes, day).map((c) => ({
    from: minutesOf(c.start),
    to: minutesOf(c.end),
  }));

  let bestFrom = -1;
  let bestLen = 0;
  let cursor = STUDY_START;
  for (const slot of [...busy, { from: STUDY_END, to: STUDY_END }]) {
    const gap = Math.min(slot.from, STUDY_END) - cursor;
    if (gap > bestLen) {
      bestLen = gap;
      bestFrom = cursor;
    }
    cursor = Math.max(cursor, Math.min(slot.to, STUDY_END));
  }

  if (bestFrom < 0 || bestLen < MIN_SESSION) return null;
  const length = Math.min(bestLen, MAX_SESSION);
  const fmt = (m: number) =>
    `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
  return { start: fmt(bestFrom), end: fmt(bestFrom + length) };
}

/**
 * Spread `count` work sessions across [start, end], skipping weekends when
 * requested, and steering around the class timetable.
 *
 * The period is split into one bucket per session so sessions stay evenly
 * spaced, then within each bucket the lightest teaching day is chosen. Each
 * session also takes the largest class-free window on that day, so it lands in
 * time that is genuinely free rather than clashing with a lecture.
 *
 * A holiday cancels *classes*, not your own work — a deadline doesn't move
 * because campus is shut, and a free day is usually the best day to get ahead.
 * So holidays stay eligible here, and are treated as having no teaching at all:
 * they carry zero load, which makes them preferred, and the whole study window
 * is free rather than routed around lectures that aren't happening.
 */
export function generateSessions(opts: {
  start: string;
  end: string;
  count: number;
  holidays: Holiday[];
  skipWeekends: boolean;
  classes?: ClassEntry[];
}): WorkSession[] {
  const endD = parseDateKey(opts.end);
  const holidays = holidaySet(opts.holidays);
  const classes = opts.classes ?? [];
  const days: string[] = [];
  for (let d = parseDateKey(opts.start); d <= endD; d = addDays(d, 1)) {
    if (opts.skipWeekends && weekdayIndex(d) >= 5) continue;
    days.push(toDateKey(d));
  }
  if (days.length === 0) return [];

  /* nothing is taught on a holiday, so the day is wide open */
  const loadOn = (key: string) =>
    holidays.has(key) ? 0 : classLoadOn(classes, weekdayIndex(parseDateKey(key)));
  const windowOn = (key: string) =>
    freeWindowOn(holidays.has(key) ? [] : classes, weekdayIndex(parseDateKey(key)));

  const n = Math.max(1, Math.min(opts.count, days.length));

  return Array.from({ length: n }, (_, i) => {
    const from = Math.floor((i * days.length) / n);
    const to = Math.max(from + 1, Math.floor(((i + 1) * days.length) / n));
    // lightest teaching day in this slice; an earlier day wins a tie so
    // sessions don't drift later than they need to
    const date = days
      .slice(from, to)
      .reduce((best, candidate) =>
        loadOn(candidate) < loadOn(best) ? candidate : best
      );

    const window = windowOn(date);
    return {
      id: uid(),
      date,
      label: `Session ${i + 1} of ${n}`,
      done: false,
      ...(window ?? {}),
    };
  });
}

/* ---- class schedule queries ---- */

export function classesOnDay(classes: ClassEntry[], day: number): ClassEntry[] {
  return classes
    .filter((c) => c.day === day)
    .sort((a, b) => minutesOf(a.start) - minutesOf(b.start));
}

/**
 * How a class actually stands on one date, once one-off exceptions are applied.
 * Returns null when that occurrence is cancelled.
 */
export function occurrenceOn(
  cls: ClassEntry,
  date: string,
  exceptions: ClassException[]
): { start: string; end: string; location?: string; changed: boolean } | null {
  const ex = exceptions.find((x) => x.classId === cls.id && x.date === date);
  if (!ex) {
    return { start: cls.start, end: cls.end, location: cls.location, changed: false };
  }
  if (ex.kind === "cancelled") return null;
  return {
    start: ex.start ?? cls.start,
    end: ex.end ?? cls.end,
    location: ex.location ?? cls.location,
    changed: true,
  };
}

export function isCancelledOn(
  cls: ClassEntry,
  date: string,
  exceptions: ClassException[]
): boolean {
  return exceptions.some(
    (x) => x.classId === cls.id && x.date === date && x.kind === "cancelled"
  );
}

export interface UpcomingClass {
  cls: ClassEntry;
  date: string;
  startsAt: Date;
  minutesUntil: number;
  /** Effective times for this date — differ from the class when it was moved. */
  start: string;
  end: string;
  location?: string;
  moved: boolean;
}

/** The next class within a week that isn't on a holiday, or null. */
export function nextClass(
  classes: ClassEntry[],
  holidays: Holiday[],
  now = new Date(),
  exceptions: ClassException[] = []
): UpcomingClass | null {
  const skip = holidaySet(holidays);
  for (let offset = 0; offset <= 7; offset++) {
    const day = addDays(startOfDay(now), offset);
    const key = toDateKey(day);
    if (skip.has(key)) continue;
    for (const cls of classesOnDay(classes, weekdayIndex(day))) {
      const occurrence = occurrenceOn(cls, key, exceptions);
      if (!occurrence) continue; // cancelled that week
      const min = minutesOf(occurrence.start);
      const startsAt = new Date(day);
      startsAt.setHours(Math.floor(min / 60), min % 60, 0, 0);
      if (startsAt.getTime() > now.getTime()) {
        return {
          cls,
          date: key,
          startsAt,
          minutesUntil: Math.round((startsAt.getTime() - now.getTime()) / 60000),
          start: occurrence.start,
          end: occurrence.end,
          location: occurrence.location,
          moved: occurrence.changed,
        };
      }
    }
  }
  return null;
}
