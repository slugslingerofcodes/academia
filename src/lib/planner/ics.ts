import type { ClassEntry, ClassException, Holiday, PlannerData } from "./types";
import { classLabel, CLASS_TYPE_LABEL } from "./types";
import {
  addDays,
  currentWeekDates,
  minutesOf,
  parseDateKey,
  toDateKey,
  weekdayIndex,
} from "./schedule";

/**
 * Builds an iCalendar (.ics) feed from the planner data.
 *
 * Times are written as "floating" local times (no TZID, no Z suffix), which
 * calendar apps interpret in the viewer's own timezone — correct for a personal
 * timetable and avoids shipping a VTIMEZONE block.
 */

const BYDAY = ["MO", "TU", "WE", "TH", "FR", "SA", "SU"] as const;

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

/** YYYYMMDD */
function icsDate(d: Date): string {
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
}

/** YYYYMMDDTHHMMSS — floating local time */
function icsDateTime(d: Date): string {
  return `${icsDate(d)}T${pad(d.getHours())}${pad(d.getMinutes())}00`;
}

/** UTC stamp for DTSTAMP */
function icsStamp(now: Date): string {
  return (
    `${now.getUTCFullYear()}${pad(now.getUTCMonth() + 1)}${pad(now.getUTCDate())}` +
    `T${pad(now.getUTCHours())}${pad(now.getUTCMinutes())}${pad(now.getUTCSeconds())}Z`
  );
}

/** Escape reserved characters in an iCalendar TEXT value. */
function esc(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

/**
 * Fold long content lines. RFC 5545 caps lines at 75 octets; folding on
 * character boundaries (never mid-character) keeps multi-byte text intact.
 */
function fold(line: string): string {
  if (line.length <= 70) return line;
  const parts: string[] = [line.slice(0, 70)];
  for (let i = 70; i < line.length; i += 69) {
    parts.push(" " + line.slice(i, i + 69));
  }
  return parts.join("\r\n");
}

function alarm(summary: string, leadMinutes: number): string[] {
  return [
    "BEGIN:VALARM",
    `TRIGGER:-PT${leadMinutes}M`,
    "ACTION:DISPLAY",
    `DESCRIPTION:${esc(summary)}`,
    "END:VALARM",
  ];
}

/** Date of this week's occurrence of `day`, used as the recurrence anchor. */
function anchorFor(day: number, now: Date): Date {
  return parseDateKey(currentWeekDates(now)[day]);
}

function classEvent(
  cls: ClassEntry,
  holidays: Holiday[],
  stamp: string,
  now: Date,
  leadMinutes: number,
  exceptions: ClassException[] = []
): string[] {
  const anchor = anchorFor(cls.day, now);
  const startMin = minutesOf(cls.start);
  const endMin = minutesOf(cls.end);

  const start = new Date(anchor);
  start.setHours(Math.floor(startMin / 60), startMin % 60, 0, 0);
  const end = new Date(anchor);
  end.setHours(Math.floor(endMin / 60), endMin % 60, 0, 0);

  const atClassTime = (dateKey: string) => {
    const d = parseDateKey(dateKey);
    d.setHours(Math.floor(startMin / 60), startMin % 60, 0, 0);
    return icsDateTime(d);
  };

  // a holiday on this weekday cancels that week's class
  const holidayDates = holidays
    .filter((h) => weekdayIndex(parseDateKey(h.date)) === cls.day)
    .map((h) => atClassTime(h.date));

  // so does a one-off cancellation; a moved class is excluded here and
  // re-added below as its own single event at the new time
  const exceptionDates = exceptions
    .filter((x) => x.classId === cls.id)
    .map((x) => atClassTime(x.date));

  const exdates = [...new Set([...holidayDates, ...exceptionDates])];

  return [
    "BEGIN:VEVENT",
    `UID:class-${cls.id}@academia`,
    `DTSTAMP:${stamp}`,
    `DTSTART:${icsDateTime(start)}`,
    `DTEND:${icsDateTime(end)}`,
    `RRULE:FREQ=WEEKLY;BYDAY=${BYDAY[cls.day]}`,
    ...(exdates.length > 0 ? [`EXDATE:${exdates.join(",")}`] : []),
    `SUMMARY:${esc(`${classLabel(cls)} (${CLASS_TYPE_LABEL[cls.type]})`)}`,
    ...(cls.location ? [`LOCATION:${esc(cls.location)}`] : []),
    ...alarm(classLabel(cls), leadMinutes),
    "END:VEVENT",
  ];
}

/** A rescheduled class: one standalone event at its new time. */
function movedEvent(
  cls: ClassEntry,
  ex: ClassException,
  stamp: string,
  leadMinutes: number
): string[] {
  const start = parseDateKey(ex.date);
  const s = minutesOf(ex.start ?? cls.start);
  const e = minutesOf(ex.end ?? cls.end);
  const from = new Date(start);
  from.setHours(Math.floor(s / 60), s % 60, 0, 0);
  const until = new Date(start);
  until.setHours(Math.floor(e / 60), e % 60, 0, 0);
  const where = ex.location ?? cls.location;

  return [
    "BEGIN:VEVENT",
    `UID:moved-${ex.id}@academia`,
    `DTSTAMP:${stamp}`,
    `DTSTART:${icsDateTime(from)}`,
    `DTEND:${icsDateTime(until)}`,
    `SUMMARY:${esc(`${classLabel(cls)} (${CLASS_TYPE_LABEL[cls.type]}) — rescheduled`)}`,
    ...(where ? [`LOCATION:${esc(where)}`] : []),
    ...alarm(classLabel(cls), leadMinutes),
    "END:VEVENT",
  ];
}

function allDayEvent(opts: {
  uid: string;
  date: string;
  summary: string;
  description?: string;
  stamp: string;
}): string[] {
  const start = parseDateKey(opts.date);
  return [
    "BEGIN:VEVENT",
    `UID:${opts.uid}@academia`,
    `DTSTAMP:${opts.stamp}`,
    `DTSTART;VALUE=DATE:${icsDate(start)}`,
    `DTEND;VALUE=DATE:${icsDate(addDays(start, 1))}`,
    `SUMMARY:${opts.summary ? esc(opts.summary) : ""}`,
    ...(opts.description ? [`DESCRIPTION:${esc(opts.description)}`] : []),
    "TRANSP:TRANSPARENT",
    "END:VEVENT",
  ];
}

export interface IcsOptions {
  includeClasses: boolean;
  includeSessions: boolean;
  includeHolidays: boolean;
  leadMinutes: number;
}

export function buildIcs(
  data: PlannerData,
  options: IcsOptions,
  now = new Date()
): string {
  const stamp = icsStamp(now);
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Academia//Student Planner//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "X-WR-CALNAME:Academia",
    "X-WR-CALDESC:Classes, work sessions and holidays from Academia",
  ];

  if (options.includeClasses) {
    for (const cls of data.classes) {
      lines.push(
        ...classEvent(
          cls,
          data.holidays,
          stamp,
          now,
          options.leadMinutes,
          data.exceptions
        )
      );
      // rescheduled occurrences were excluded from the recurrence, so add each
      // back as its own event at the time it actually moved to
      for (const ex of data.exceptions) {
        if (ex.classId !== cls.id || ex.kind === "cancelled") continue;
        lines.push(...movedEvent(cls, ex, stamp, options.leadMinutes));
      }
    }
  }

  if (options.includeSessions) {
    for (const project of data.projects) {
      for (const session of project.sessions) {
        if (session.done) continue;
        lines.push(
          ...allDayEvent({
            uid: `session-${session.id}`,
            date: session.date,
            summary: `${project.name} — ${session.label}`,
            description: project.notes,
            stamp,
          })
        );
      }
    }
  }

  if (options.includeHolidays) {
    for (const holiday of data.holidays) {
      lines.push(
        ...allDayEvent({
          uid: `holiday-${holiday.id}`,
          date: holiday.date,
          summary: holiday.label ? `Holiday — ${holiday.label}` : "Holiday",
          stamp,
        })
      );
    }
  }

  lines.push("END:VCALENDAR");
  return lines.map(fold).join("\r\n") + "\r\n";
}

/** Number of events the current options would export. */
export function countEvents(data: PlannerData, options: IcsOptions): number {
  let n = 0;
  if (options.includeClasses) n += data.classes.length;
  if (options.includeSessions)
    n += data.projects.reduce(
      (sum, p) => sum + p.sessions.filter((s) => !s.done).length,
      0
    );
  if (options.includeHolidays) n += data.holidays.length;
  return n;
}

/** Trigger a download of the .ics file in the browser. */
export function downloadIcs(contents: string, filename = "academia.ics"): void {
  const blob = new Blob([contents], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * A Google Calendar "add event" deep link for a single class — opens the
 * prefilled event form, useful for adding one class without a full import.
 */
export function googleEventLink(cls: ClassEntry, now = new Date()): string {
  const anchor = anchorFor(cls.day, now);
  const startMin = minutesOf(cls.start);
  const endMin = minutesOf(cls.end);
  const start = new Date(anchor);
  start.setHours(Math.floor(startMin / 60), startMin % 60, 0, 0);
  const end = new Date(anchor);
  end.setHours(Math.floor(endMin / 60), endMin % 60, 0, 0);

  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: cls.title,
    dates: `${icsDateTime(start)}/${icsDateTime(end)}`,
    recur: `RRULE:FREQ=WEEKLY;BYDAY=${BYDAY[cls.day]}`,
  });
  if (cls.location) params.set("location", cls.location);
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

export const dateKeyOf = toDateKey;
