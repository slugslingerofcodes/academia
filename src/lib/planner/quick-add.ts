import type {
  ClassEntry,
  ClassType,
  ExceptionKind,
  PlannerData,
} from "./types";
import { classLabel } from "./types";
import { DAY_FULL, DAY_NAMES, minutesOf, parseDateKey, toDateKey, weekdayIndex } from "./schedule";

/**
 * Reads one typed line and works out what the user meant to add.
 *
 * "MATH F111 lecture Mon 9-10 in LT1" is faster to type than filling six
 * fields, but free text is ambiguous in a way a form isn't. So this only ever
 * produces a *reading* of the line: the caller shows what was understood, field
 * by field, and the user confirms it. Nothing here writes anything.
 *
 * Everything is deterministic — no model, no network. That keeps it working
 * offline and makes every rule visible and testable.
 */

const DAY_NAMES_PATTERN: [string, number][] = [
  ["mondays?|mon", 0],
  ["tuesdays?|tues|tue", 1],
  ["wednesdays?|weds|wed", 2],
  ["thursdays?|thurs|thur|thu", 3],
  ["fridays?|fri", 4],
  ["saturdays?|sat", 5],
  ["sundays?|sun", 6],
];

/*
 * A day takes any conjunction in front of it with it, so "Tue and Thu" leaves
 * nothing behind. Stripping "and" from the whole line instead would quietly
 * rename a subject like "Science and Technology".
 */
const DAY_WORDS: [RegExp, number][] = DAY_NAMES_PATTERN.map(([pattern, index]) => [
  new RegExp(`(?:\\b(?:and|&|\\+)\\s+|,\\s*)?\\b(?:${pattern})\\b`, "i"),
  index,
]);

const MONTHS = [
  "jan", "feb", "mar", "apr", "may", "jun",
  "jul", "aug", "sep", "oct", "nov", "dec",
];

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function hhmm(total: number): string {
  return `${pad(Math.floor(total / 60) % 24)}:${pad(total % 60)}`;
}

/* ---- what a reading looks like ---- */

export interface ParsedField {
  label: string;
  value: string;
}

export interface QuickClass {
  kind: "class";
  code?: string;
  title: string;
  type: ClassType;
  /** 0 = Monday … 6 = Sunday; more than one when several days are named. */
  days: number[];
  start: string;
  end: string;
  location?: string;
}

export interface QuickHoliday {
  kind: "holiday";
  date: string;
  label?: string;
}

export interface QuickException {
  kind: "exception";
  cls: ClassEntry;
  date: string;
  change: ExceptionKind;
  start?: string;
  end?: string;
  location?: string;
}

export type QuickAdd = QuickClass | QuickHoliday | QuickException;

export interface QuickAddResult {
  parsed: QuickAdd | null;
  /** Why nothing could be made of the line, when nothing could. */
  problem?: string;
  /** The parts that were recognised, so the reading can be checked. */
  understood: ParsedField[];
}

/* ---- small parsers, each removing what it consumed ---- */

/**
 * A time or time range: "9-10", "09:00-10:00", "2-4pm", "at 11am".
 *
 * When only the later half carries am/pm the earlier half inherits it, so
 * "2-4pm" is an afternoon lab rather than two in the morning. With no am/pm at
 * all, anything before 8 is read as afternoon — a class at 1 means 13:00, since
 * nothing on a university timetable starts at one in the morning.
 */
export function parseTimeRange(
  text: string
): { start: string; end?: string; consumed: string } | null {
  const range = text.match(
    /\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\s*(?:-|–|—|to|till|until)\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i
  );
  if (range) {
    const [consumed, h1, m1, s1, h2, m2, s2] = range;
    const suffix1 = (s1 ?? s2 ?? "").toLowerCase();
    const suffix2 = (s2 ?? s1 ?? "").toLowerCase();
    const startMin = toMinutes(Number(h1), Number(m1 ?? 0), suffix1);
    let endMin = toMinutes(Number(h2), Number(m2 ?? 0), suffix2);
    if (startMin === null || endMin === null) return null;
    // "11-1" means eleven to one o'clock, not eleven to one in the morning
    if (endMin <= startMin && endMin + 720 > startMin) endMin += 720;
    if (endMin <= startMin) return null;
    return { start: hhmm(startMin), end: hhmm(endMin), consumed };
  }

  const single = text.match(/\b(?:at\s+)?(\d{1,2})(?::(\d{2}))\s*(am|pm)?|\b(?:at\s+)?(\d{1,2})\s*(am|pm)\b/i);
  if (single) {
    const h = single[1] ?? single[4];
    const m = single[2] ?? "0";
    const s = (single[3] ?? single[5] ?? "").toLowerCase();
    const startMin = toMinutes(Number(h), Number(m), s);
    if (startMin === null) return null;
    return { start: hhmm(startMin), consumed: single[0] };
  }
  return null;
}

function toMinutes(hour: number, minute: number, suffix: string): number | null {
  if (hour > 23 || minute > 59) return null;
  let h = hour;
  if (suffix === "pm" && h < 12) h += 12;
  else if (suffix === "am" && h === 12) h = 0;
  // no am/pm given: assume the working day, so 1 means 13:00
  else if (!suffix && h < 8) h += 12;
  return h * 60 + minute;
}

/** Every weekday named in the line. */
export function parseDays(text: string): { days: number[]; consumed: string[] } {
  const days: number[] = [];
  const consumed: string[] = [];
  for (const [re, index] of DAY_WORDS) {
    const m = text.match(re);
    if (m) {
      days.push(index);
      consumed.push(m[0]);
    }
  }
  return { days: [...new Set(days)].sort((a, b) => a - b), consumed };
}

/**
 * A room, named as such.
 *
 * Only after a preposition or the word room/venue/hall, or as a lecture-theatre
 * code like LT3. A bare number is left alone: in "Physics 2 at 4pm" the 2 is
 * part of the subject, and guessing otherwise invents a room.
 */
export function parseRoom(text: string): { room: string; consumed: string } | null {
  const explicit = text.match(
    /\b(?:in|at|room|rooms|venue|hall)\s+(?:no\.?\s*)?([A-Z]{1,3}-?\d{1,4}[A-Z]?|\d{3,4}[A-Z]?)\b/i
  );
  if (explicit) return { room: explicit[1].toUpperCase(), consumed: explicit[0] };

  const theatre = text.match(/\b(LT-?\d{1,3}[A-Z]?)\b/i);
  if (theatre) return { room: theatre[1].toUpperCase(), consumed: theatre[0] };
  return null;
}

/** A calendar date: "26 June", "June 26", "26/6", or a weekday name. */
export function parseDate(
  text: string,
  now: Date
): { date: string; consumed: string } | null {
  const lower = text.toLowerCase();
  /* Matching happens on a lowercased copy, so the span has to be taken from
     the original — otherwise "26 june" won't strip "26 June" from the line. */
  const span = (m: RegExpMatchArray) => text.slice(m.index!, m.index! + m[0].length);

  const dayMonth = lower.match(
    /\b(\d{1,2})(?:st|nd|rd|th)?\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s*(\d{4})?/
  );
  if (dayMonth) {
    const month = MONTHS.indexOf(dayMonth[2]);
    const year = dayMonth[3] ? Number(dayMonth[3]) : yearFor(month, now);
    return {
      date: `${year}-${pad(month + 1)}-${pad(Number(dayMonth[1]))}`,
      consumed: span(dayMonth),
    };
  }

  const monthDay = lower.match(
    /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+(\d{1,2})(?:st|nd|rd|th)?\s*(\d{4})?/
  );
  if (monthDay) {
    const month = MONTHS.indexOf(monthDay[1]);
    const year = monthDay[3] ? Number(monthDay[3]) : yearFor(month, now);
    return {
      date: `${year}-${pad(month + 1)}-${pad(Number(monthDay[2]))}`,
      consumed: span(monthDay),
    };
  }

  const numeric = lower.match(/\b(\d{1,2})[/.-](\d{1,2})(?:[/.-](\d{2,4}))?\b/);
  if (numeric) {
    const year = numeric[3]
      ? Number(numeric[3].length === 2 ? `20${numeric[3]}` : numeric[3])
      : now.getFullYear();
    return {
      date: `${year}-${pad(Number(numeric[2]))}-${pad(Number(numeric[1]))}`,
      consumed: span(numeric),
    };
  }

  // a weekday on its own means the next one coming up
  const { days, consumed } = parseDays(text);
  if (days.length === 1) {
    for (let i = 0; i < 8; i++) {
      const d = new Date(now);
      d.setDate(d.getDate() + i);
      if (weekdayIndex(d) === days[0]) return { date: toDateKey(d), consumed: consumed[0] };
    }
  }
  return null;
}

/** A month already well past is next year's, not one eleven months gone. */
function yearFor(month: number, now: Date): number {
  return month < now.getMonth() - 6 ? now.getFullYear() + 1 : now.getFullYear();
}

function parseType(text: string): { type: ClassType; consumed: string | null } {
  const lab = text.match(/\blab(oratory|s)?\b/i);
  if (lab) return { type: "lab", consumed: lab[0] };
  const tut = text.match(/\btut(orial|orials|s)?\b/i);
  if (tut) return { type: "tutorial", consumed: tut[0] };
  const lec = text.match(/\blectures?\b/i);
  return { type: "lecture", consumed: lec ? lec[0] : null };
}

/** Whatever is left once the recognised parts are taken out. */
function tidy(text: string): string {
  return text
    .replace(/\b(?:on|at|in|from|to|every|each|the|a|an|of|for|starts?|starting)\b/gi, " ")
    .replace(/[,;:@]+/g, " ")
    .replace(/\s*[-–—]\s*/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Split a leftover name into a subject code and a title, if it has both. */
function splitName(name: string): { code?: string; title: string } {
  const leading = name.match(/^([A-Z]{2,5}\s?[A-Z]?\d{2,4}[A-Z]?)\s+(.+)$/i);
  if (leading) return { code: leading[1].toUpperCase(), title: leading[2].trim() };
  const codeOnly = name.match(/^([A-Z]{2,5}\s?[A-Z]?\d{2,4}[A-Z]?)$/i);
  if (codeOnly) return { code: codeOnly[1].toUpperCase(), title: codeOnly[1].toUpperCase() };
  return { title: name };
}

/** Which known class the line is talking about — code first, then name. */
function matchClass(text: string, classes: ClassEntry[]): ClassEntry | null {
  const squashed = text.toLowerCase().replace(/\s+/g, " ");
  const byCode = classes
    .filter((c) => c.code)
    .find((c) => squashed.includes(c.code!.toLowerCase()));
  if (byCode) return byCode;
  return (
    classes.find((c) => c.title.length >= 4 && squashed.includes(c.title.toLowerCase())) ?? null
  );
}

/* ---- the reading itself ---- */

const CANCEL = /\b(cancel|cancels|cancelled|canceled|call(?:ed)? off|no class)\b/i;
const MOVE = /\b(move[ds]?|moving|reschedul\w*|shift(?:ed)?|postpone[ds]?|prepone[ds]?)\b/i;
const HOLIDAY = /\bholiday\b/i;

export function parseQuickAdd(
  input: string,
  data: PlannerData,
  now = new Date()
): QuickAddResult {
  const text = input.trim();
  if (!text) return { parsed: null, understood: [] };

  if (HOLIDAY.test(text)) return readHoliday(text, now);

  const wantsCancel = CANCEL.test(text);
  const wantsMove = MOVE.test(text);
  if (wantsCancel || wantsMove) {
    const cls = matchClass(text, data.classes);
    if (cls) return readException(text, cls, wantsCancel, now);
    // a change to a class we don't have isn't something we can record
    if (data.classes.length > 0) {
      return {
        parsed: null,
        problem:
          "That looks like a change to an existing class, but no class here matches it. Check the subject code.",
        understood: [],
      };
    }
  }

  return readClass(text);
}

function readHoliday(text: string, now: Date): QuickAddResult {
  const found = parseDate(text, now);
  if (!found) {
    return {
      parsed: null,
      problem: "Add a date for the holiday, like “holiday on 26 June”.",
      understood: [],
    };
  }
  let rest = text.replace(found.consumed, " ").replace(HOLIDAY, " ");
  rest = tidy(rest.replace(/\b(?:declared|observed|as)\b/gi, " "));
  const label = rest.length >= 2 ? rest : undefined;

  return {
    parsed: { kind: "holiday", date: found.date, label },
    understood: [
      { label: "Add", value: "a holiday" },
      { label: "Date", value: found.date },
      ...(label ? [{ label: "Reason", value: label }] : []),
    ],
  };
}

function readException(
  text: string,
  cls: ClassEntry,
  wantsCancel: boolean,
  now: Date
): QuickAddResult {
  let rest = text;
  const code = cls.code ?? cls.title;
  rest = rest.replace(new RegExp(code.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"), " ");

  const time = wantsCancel ? null : parseTimeRange(rest);
  if (time) rest = rest.replace(time.consumed, " ");
  const room = wantsCancel ? null : parseRoom(rest);
  if (room) rest = rest.replace(room.consumed, " ");

  const found = parseDate(rest, now);
  if (!found) {
    return {
      parsed: null,
      problem: `Add the date this applies to — ${classLabel(cls)} meets every ${DAY_FULL[cls.day]}, so which one?`,
      understood: [],
    };
  }

  if (weekdayIndex(parseDateKey(found.date)) !== cls.day) {
    return {
      parsed: null,
      problem: `${classLabel(cls)} meets on ${DAY_FULL[cls.day]}, and ${found.date} is a ${
        DAY_FULL[weekdayIndex(parseDateKey(found.date))]
      }.`,
      understood: [],
    };
  }

  const change: ExceptionKind = wantsCancel ? "cancelled" : time ? "moved" : "room";
  if (change === "room" && !room) {
    return {
      parsed: null,
      problem: "Say what it moves to — a new time, or a new room.",
      understood: [],
    };
  }

  // an unstated end keeps the class's own length
  const length = minutesOf(cls.end) - minutesOf(cls.start);
  const end =
    change === "moved"
      ? (time!.end ?? hhmm(minutesOf(time!.start) + length))
      : undefined;

  return {
    parsed: {
      kind: "exception",
      cls,
      date: found.date,
      change,
      start: change === "moved" ? time!.start : undefined,
      end,
      location: room?.room,
    },
    understood: [
      { label: "Change", value: change === "cancelled" ? "Cancel this one class" : change === "moved" ? "Reschedule this one class" : "Change the room for one class" },
      { label: "Class", value: classLabel(cls) },
      { label: "Date", value: `${DAY_NAMES[cls.day]} ${found.date}` },
      ...(change === "moved" ? [{ label: "New time", value: `${time!.start}–${end}` }] : []),
      ...(room ? [{ label: "New room", value: room.room }] : []),
    ],
  };
}

function readClass(text: string): QuickAddResult {
  let rest = text;

  const { days, consumed: dayWords } = parseDays(rest);
  for (const word of dayWords) rest = rest.replace(word, " ");

  const time = parseTimeRange(rest);
  if (time) rest = rest.replace(time.consumed, " ");

  const room = parseRoom(rest);
  if (room) rest = rest.replace(room.consumed, " ");

  const { type, consumed: typeWord } = parseType(rest);
  if (typeWord) rest = rest.replace(typeWord, " ");

  const name = tidy(rest);

  if (days.length === 0) {
    return {
      parsed: null,
      problem: "Say which day it meets, like “Mon” or “Tuesday”.",
      understood: [],
    };
  }
  if (!time) {
    return {
      parsed: null,
      problem: "Say what time it starts, like “9”, “9:30” or “2pm”.",
      understood: [],
    };
  }
  if (!name) {
    return {
      parsed: null,
      problem: "Give the subject a name, like “MATH F111 Mathematics I”.",
      understood: [],
    };
  }

  const { code, title } = splitName(name);
  // an unstated end runs an hour, which is the common case
  const end = time.end ?? hhmm(minutesOf(time.start) + 60);

  return {
    parsed: {
      kind: "class",
      code,
      title,
      type,
      days,
      start: time.start,
      end,
      location: room?.room,
    },
    understood: [
      { label: "Add", value: days.length > 1 ? `a weekly class on ${days.length} days` : "a weekly class" },
      ...(code ? [{ label: "Code", value: code }] : []),
      { label: "Subject", value: title },
      { label: "Kind", value: type },
      { label: "Days", value: days.map((d) => DAY_FULL[d]).join(", ") },
      { label: "Time", value: `${time.start}–${end}` },
      ...(room ? [{ label: "Room", value: room.room }] : []),
    ],
  };
}
