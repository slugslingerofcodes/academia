import { CLASS_TYPES, type ClassType } from "./types";

/**
 * Reads an iCalendar (.ics) file and pulls out weekly classes.
 *
 * Aimed at real-world files — a university timetable export, or a calendar
 * exported from Google — so it copes with folded lines, property parameters,
 * UTC and floating times, RRULE/BYDAY and DURATION instead of DTEND.
 */

export interface ParsedClass {
  code?: string;
  title: string;
  type: ClassType;
  /** 0 = Monday … 6 = Sunday. */
  day: number;
  start: string;
  end: string;
  location?: string;
}

export interface ImportResult {
  classes: ParsedClass[];
  /** Events that were read but aren't weekly classes (all-day, etc). */
  skipped: number;
  warnings: string[];
}

const BYDAY_INDEX: Record<string, number> = {
  MO: 0, TU: 1, WE: 2, TH: 3, FR: 4, SA: 5, SU: 6,
};

/** Undo RFC 5545 line folding: continuation lines begin with a space or tab. */
function unfold(text: string): string[] {
  const raw = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
  const out: string[] = [];
  for (const line of raw) {
    if ((line.startsWith(" ") || line.startsWith("\t")) && out.length > 0) {
      out[out.length - 1] += line.slice(1);
    } else {
      out.push(line);
    }
  }
  return out.filter((l) => l.trim() !== "");
}

function unescapeText(value: string): string {
  return value
    .replace(/\\n/gi, "\n")
    .replace(/\\,/g, ",")
    .replace(/\\;/g, ";")
    .replace(/\\\\/g, "\\");
}

interface Property {
  name: string;
  params: Record<string, string>;
  value: string;
}

function parseProperty(line: string): Property | null {
  const colon = line.indexOf(":");
  if (colon < 0) return null;
  const head = line.slice(0, colon);
  const value = line.slice(colon + 1);
  const [name, ...paramParts] = head.split(";");
  const params: Record<string, string> = {};
  for (const p of paramParts) {
    const eq = p.indexOf("=");
    if (eq > 0) params[p.slice(0, eq).toUpperCase()] = p.slice(eq + 1).replace(/"/g, "");
  }
  return { name: name.toUpperCase(), params, value };
}

interface Moment {
  date: Date;
  /** All-day events carry a date but no clock time. */
  dateOnly: boolean;
}

/**
 * Parse an iCalendar date-time. UTC values (trailing Z) are converted to local;
 * floating and TZID values are read as local wall-clock, which is what a
 * personal timetable wants.
 */
function parseMoment(prop: Property): Moment | null {
  const v = prop.value.trim();
  const dateOnly = prop.params.VALUE === "DATE" || /^\d{8}$/.test(v);

  const m = v.match(/^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})(Z)?)?$/);
  if (!m) return null;

  const [, y, mo, d, hh, mm, ss, z] = m;
  if (dateOnly || hh === undefined) {
    return { date: new Date(Number(y), Number(mo) - 1, Number(d)), dateOnly: true };
  }

  const date = z
    ? new Date(
        Date.UTC(Number(y), Number(mo) - 1, Number(d), Number(hh), Number(mm), Number(ss))
      )
    : new Date(Number(y), Number(mo) - 1, Number(d), Number(hh), Number(mm), Number(ss));

  return { date, dateOnly: false };
}

/** ISO 8601 duration (e.g. PT1H30M) in minutes. */
function parseDurationMinutes(value: string): number | null {
  const m = value.trim().match(/^P(?:(\d+)W)?(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/);
  if (!m) return null;
  const [, w, d, h, min] = m;
  return (
    (Number(w ?? 0) * 7 * 24 + Number(d ?? 0) * 24 + Number(h ?? 0)) * 60 + Number(min ?? 0)
  );
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function hhmm(d: Date): string {
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function weekdayOf(d: Date): number {
  return (d.getDay() + 6) % 7;
}

/**
 * Split a calendar SUMMARY into code, name and kind. Handles what this app
 * exports ("MATH F111 — Mathematics I (Lecture)") and degrades sensibly for
 * anything else.
 */
export function interpretSummary(summary: string): {
  code?: string;
  title: string;
  type: ClassType;
} {
  let text = summary.trim();
  let type: ClassType = "lecture";

  const bracketed = text.match(/\(([^)]+)\)\s*$/);
  if (bracketed) {
    const guess = bracketed[1].trim().toLowerCase();
    const match = CLASS_TYPES.find((t) => t === guess);
    if (match) {
      type = match;
      text = text.slice(0, bracketed.index).trim();
    }
  } else if (/\blab(oratory)?\b/i.test(text)) {
    type = "lab";
  } else if (/\btut(orial)?\b/i.test(text)) {
    type = "tutorial";
  }

  // "CODE — Name" or "CODE - Name"
  const split = text.match(/^(.{2,12}?)\s+[—–-]\s+(.+)$/);
  if (split) {
    return { code: split[1].trim(), title: split[2].trim(), type };
  }

  // "MATH F111 Mathematics I" — a leading code-like token
  const leading = text.match(/^([A-Z]{2,5}\s?[A-Z]?\d{2,4}[A-Z]?)\s+(.+)$/);
  if (leading) {
    return { code: leading[1].trim(), title: leading[2].trim(), type };
  }

  return { title: text || "Untitled class", type };
}

export function parseIcs(text: string): ImportResult {
  const lines = unfold(text);
  const result: ImportResult = { classes: [], skipped: 0, warnings: [] };

  if (!lines.some((l) => l.toUpperCase().startsWith("BEGIN:VCALENDAR"))) {
    result.warnings.push("That doesn't look like a calendar (.ics) file.");
    return result;
  }

  let current: Property[] | null = null;

  for (const line of lines) {
    const upper = line.toUpperCase();
    if (upper.startsWith("BEGIN:VEVENT")) {
      current = [];
      continue;
    }
    if (upper.startsWith("END:VEVENT")) {
      if (current) collectEvent(current, result);
      current = null;
      continue;
    }
    if (!current) continue;
    const prop = parseProperty(line);
    if (prop) current.push(prop);
  }

  if (result.classes.length === 0 && result.warnings.length === 0) {
    result.warnings.push("No weekly classes found in that file.");
  }
  return result;
}

function collectEvent(props: Property[], result: ImportResult) {
  const find = (name: string) => props.find((p) => p.name === name);

  const dtstart = find("DTSTART");
  if (!dtstart) {
    result.skipped++;
    return;
  }

  const start = parseMoment(dtstart);
  if (!start) {
    result.skipped++;
    return;
  }

  // all-day entries are holidays or reminders, not timetable slots
  if (start.dateOnly) {
    result.skipped++;
    return;
  }

  let endDate: Date | null = null;
  const dtend = find("DTEND");
  if (dtend) {
    endDate = parseMoment(dtend)?.date ?? null;
  } else {
    const duration = find("DURATION");
    const minutes = duration ? parseDurationMinutes(duration.value) : null;
    if (minutes !== null) endDate = new Date(start.date.getTime() + minutes * 60000);
  }
  if (!endDate || endDate <= start.date) {
    endDate = new Date(start.date.getTime() + 60 * 60000);
  }

  const summary = find("SUMMARY");
  const { code, title, type } = interpretSummary(
    summary ? unescapeText(summary.value) : "Untitled class"
  );
  const location = find("LOCATION");

  // A weekly RRULE may name several days; otherwise use DTSTART's own weekday.
  let days: number[] = [weekdayOf(start.date)];
  const rrule = find("RRULE");
  if (rrule) {
    const parts = Object.fromEntries(
      rrule.value.split(";").map((p) => {
        const [k, v] = p.split("=");
        return [k.toUpperCase(), v ?? ""];
      })
    );
    if (parts.FREQ && parts.FREQ.toUpperCase() !== "WEEKLY") {
      // monthly/yearly events aren't weekly timetable slots
      result.skipped++;
      return;
    }
    if (parts.BYDAY) {
      const mapped = parts.BYDAY.split(",")
        .map((d) => BYDAY_INDEX[d.trim().slice(-2).toUpperCase()])
        .filter((d): d is number => d !== undefined);
      if (mapped.length > 0) days = mapped;
    }
  }

  for (const day of days) {
    result.classes.push({
      code,
      title,
      type,
      day,
      start: hhmm(start.date),
      end: hhmm(endDate),
      location: location ? unescapeText(location.value).trim() || undefined : undefined,
    });
  }
}

/** True when an identical slot already exists, so imports can skip duplicates. */
export function isDuplicate(
  candidate: ParsedClass,
  existing: { title: string; day: number; start: string }[]
): boolean {
  return existing.some(
    (c) => c.title === candidate.title && c.day === candidate.day && c.start === candidate.start
  );
}
