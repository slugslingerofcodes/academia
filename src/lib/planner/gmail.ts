import type { ClassEntry, ExceptionKind, PlannerData } from "./types";
import { classLabel } from "./types";
import { DAY_NAMES, minutesOf, toDateKey, weekdayIndex } from "./schedule";
import { requestAccessToken } from "./google-calendar";

/**
 * Reads recent mail and works out which of them look like timetable changes.
 *
 * Everything here stops at a *proposal*. Email is content written by anyone, so
 * nothing is applied automatically — a message saying "all classes cancelled"
 * would otherwise quietly wipe a week. The user sees each suggestion, with the
 * sentence it came from, and decides.
 *
 * Access is read-only and requested only when a scan is run.
 */

export const GMAIL_SCOPE = "https://www.googleapis.com/auth/gmail.readonly";
const LIST = "https://gmail.googleapis.com/gmail/v1/users/me/messages";

/** Keeps the scan near mail that plausibly concerns the timetable. */
const QUERY =
  "newer_than:60d " +
  "(cancelled OR canceled OR rescheduled OR postponed OR preponed OR " +
  '"extra class" OR "makeup class" OR "make-up class" OR ' +
  '"venue change" OR "room change" OR "shifted to" OR ' +
  '"observed as a holiday" OR "declared a holiday" OR "Announcement of Holiday")';

/* ---- message fetching ---- */

interface GmailPart {
  mimeType?: string;
  body?: { data?: string; size?: number };
  parts?: GmailPart[];
}

export interface Message {
  id: string;
  subject: string;
  from: string;
  date: string;
  body: string;
}

function decode(data: string): string {
  try {
    const normalised = data.replace(/-/g, "+").replace(/_/g, "/");
    const binary = atob(normalised);
    const bytes = Uint8Array.from(binary, (ch) => ch.charCodeAt(0));
    return new TextDecoder("utf-8").decode(bytes);
  } catch {
    return "";
  }
}

/** Depth-first search for the first readable text part. */
function extractBody(part: GmailPart | undefined): string {
  if (!part) return "";
  if (part.mimeType === "text/plain" && part.body?.data) {
    return decode(part.body.data);
  }
  for (const child of part.parts ?? []) {
    const found = extractBody(child);
    if (found) return found;
  }
  if (part.mimeType === "text/html" && part.body?.data) {
    return decode(part.body.data)
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<[^>]+>/g, " ");
  }
  return "";
}

async function readError(res: Response): Promise<string> {
  try {
    const body = (await res.json()) as { error?: { message?: string } };
    return body.error?.message ?? `HTTP ${res.status}`;
  } catch {
    return `HTTP ${res.status}`;
  }
}

export async function fetchRecentMail(limit = 25): Promise<Message[]> {
  const token = await requestAccessToken(GMAIL_SCOPE);
  const headers = { Authorization: `Bearer ${token}` };

  const listRes = await fetch(
    `${LIST}?q=${encodeURIComponent(QUERY)}&maxResults=${limit}`,
    { headers }
  );
  if (!listRes.ok) throw new Error(await readError(listRes));
  const list = (await listRes.json()) as { messages?: { id: string }[] };

  const out: Message[] = [];
  for (const { id } of list.messages ?? []) {
    const res = await fetch(`${LIST}/${id}?format=full`, { headers });
    if (!res.ok) continue;
    const msg = (await res.json()) as {
      payload?: GmailPart & { headers?: { name: string; value: string }[] };
      internalDate?: string;
    };
    const header = (name: string) =>
      msg.payload?.headers?.find((h) => h.name.toLowerCase() === name)?.value ?? "";
    out.push({
      id,
      subject: header("subject"),
      from: header("from"),
      date: msg.internalDate
        ? new Date(Number(msg.internalDate)).toISOString()
        : header("date"),
      body: extractBody(msg.payload).slice(0, 4000),
    });
  }
  return out;
}

/* ---- interpretation ---- */

interface ProposalBase {
  id: string;
  messageId: string;
  /** The sentence this was read from, so the user can judge it. */
  evidence: string;
  subject: string;
  from: string;
  receivedAt: string;
}

/** A one-off change to a single class occurrence. */
export interface ClassProposal extends ProposalBase {
  target: "class";
  cls: ClassEntry;
  date: string;
  kind: ExceptionKind;
  start?: string;
  end?: string;
  location?: string;
}

/** A campus-wide holiday announcement. */
export interface HolidayProposal extends ProposalBase {
  target: "holiday";
  date: string;
  label: string;
}

export type Proposal = ClassProposal | HolidayProposal;

const MONTHS = [
  "jan", "feb", "mar", "apr", "may", "jun",
  "jul", "aug", "sep", "oct", "nov", "dec",
];

function pad(n: number) {
  return String(n).padStart(2, "0");
}

/** Parse "12 Aug", "Aug 12", "12/08" or a weekday name, near `received`. */
function findDate(text: string, received: Date): string | null {
  const lower = text.toLowerCase();

  const dayMonth = lower.match(
    /\b(\d{1,2})(?:st|nd|rd|th)?\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/
  );
  if (dayMonth) {
    const month = MONTHS.indexOf(dayMonth[2]);
    const year =
      month < received.getMonth() - 6
        ? received.getFullYear() + 1
        : received.getFullYear();
    return `${year}-${pad(month + 1)}-${pad(Number(dayMonth[1]))}`;
  }

  const monthDay = lower.match(
    /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+(\d{1,2})\b/
  );
  if (monthDay) {
    const month = MONTHS.indexOf(monthDay[1]);
    return `${received.getFullYear()}-${pad(month + 1)}-${pad(Number(monthDay[2]))}`;
  }

  const numeric = lower.match(/\b(\d{1,2})[/-](\d{1,2})(?:[/-](\d{2,4}))?\b/);
  if (numeric) {
    const year = numeric[3]
      ? Number(numeric[3].length === 2 ? `20${numeric[3]}` : numeric[3])
      : received.getFullYear();
    return `${year}-${pad(Number(numeric[2]))}-${pad(Number(numeric[1]))}`;
  }

  // "on Thursday" — the next such weekday from when the mail arrived
  const named = lower.match(
    /\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/
  );
  if (named) {
    const want = [
      "monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday",
    ].indexOf(named[1]);
    for (let i = 0; i < 8; i++) {
      const d = new Date(received);
      d.setDate(d.getDate() + i);
      if (weekdayIndex(d) === want) return toDateKey(d);
    }
  }
  return null;
}

/** Parse "3 pm", "15:00", "3.30pm" into "HH:MM". */
function findTime(text: string): string | null {
  const m = text
    .toLowerCase()
    .match(/\b(\d{1,2})[:.](\d{2})\s*(am|pm)?|\b(\d{1,2})\s*(am|pm)\b/);
  if (!m) return null;
  let hour: number;
  let minute = 0;
  let suffix: string | undefined;
  if (m[1] !== undefined) {
    hour = Number(m[1]);
    minute = Number(m[2]);
    suffix = m[3];
  } else {
    hour = Number(m[4]);
    suffix = m[5];
  }
  if (suffix === "pm" && hour < 12) hour += 12;
  if (suffix === "am" && hour === 12) hour = 0;
  if (hour > 23 || minute > 59) return null;
  return `${pad(hour)}:${pad(minute)}`;
}

function findRoom(text: string): string | null {
  const m = text.match(
    /\b(?:room|venue|hall|lt|lab)\s*(?:no\.?|number)?\s*[:\-]?\s*([A-Z]{0,3}[-\s]?\d{1,4}[A-Z]?)\b/i
  );
  return m ? m[1].trim().toUpperCase() : null;
}

function classify(text: string): ExceptionKind | null {
  const t = text.toLowerCase();
  if (/\b(cancell?ed|no class|will not be held|called off)\b/.test(t)) return "cancelled";
  if (/\b(reschedul|postpon|prepon|shifted to|moved to|advanced to)/.test(t)) return "moved";
  if (/\b(venue|room)\b.*\b(chang|shift|moved)/.test(t) || /\b(chang|shift)\w*\b.*\b(venue|room)\b/.test(t))
    return "room";
  return null;
}

/** Which known class a message is about, matched on code first then name. */
function matchClass(text: string, classes: ClassEntry[]): ClassEntry | null {
  const squashed = text.toLowerCase().replace(/\s+/g, " ");
  const byCode = classes
    .filter((c) => c.code)
    .find((c) => squashed.includes(c.code!.toLowerCase()));
  if (byCode) return byCode;
  return (
    classes.find(
      (c) => c.title.length >= 4 && squashed.includes(c.title.toLowerCase())
    ) ?? null
  );
}

function evidenceForHoliday(text: string): string {
  const sentence = text
    .split(/(?<=[.!?])\s+|\n+/)
    .map((s) => s.trim())
    .find((s) => /holiday/i.test(s));
  return (sentence ?? text.slice(0, 160)).replace(/\s+/g, " ").slice(0, 200);
}

/** The sentence a decision came from, for the user to check against. */
function evidenceFor(text: string, kind: ExceptionKind): string {
  const words: Record<ExceptionKind, RegExp> = {
    cancelled: /cancell?ed|no class|will not be held|called off/i,
    moved: /reschedul|postpon|prepon|shifted to|moved to|advanced to/i,
    room: /venue|room/i,
  };
  const sentence = text
    .split(/(?<=[.!?])\s+|\n+/)
    .map((s) => s.trim())
    .find((s) => words[kind].test(s));
  return (sentence ?? text.slice(0, 160)).replace(/\s+/g, " ").slice(0, 200);
}

/**
 * Campus holiday announcements, e.g. "26 June 2026 (Friday) shall be observed
 * as a holiday on account of Muharram". These arrive from the registrar and
 * concern every class at once, so they become a Holiday rather than a per-class
 * exception.
 */
function findHoliday(msg: Message): { date: string; label: string } | null {
  const text = `${msg.subject}\n${msg.body}`;
  if (!/observed as a holiday|declared a holiday|announcement of holiday/i.test(text)) {
    return null;
  }

  // the date sits right beside the holiday wording, so read that neighbourhood
  const near =
    text.match(
      /(\d{1,2}\s+[A-Za-z]+\s+\d{4})[^.]{0,80}?(?:shall be |is |was )?observed as a holiday/i
    ) ??
    text.match(/holiday[^.]{0,80}?on\s+(\d{1,2}\s+[A-Za-z]+\s+\d{4})/i);
  if (!near) return null;

  const parsed = new Date(near[1]);
  if (Number.isNaN(parsed.getTime())) return null;

  // stop before the trailing preposition — "of Muharram on 26 June" must not
  // capture "Muharram on"
  const reason = text.match(
    /on account of\s+([A-Za-z'&. -]{3,40}?)(?=\s+(?:on|at|in|from|for)\b|[,.;]|\s*$)/i
  );
  return {
    date: toDateKey(parsed),
    label: reason ? reason[1].trim() : "Holiday",
  };
}

/**
 * Turn messages into proposals. A message only produces one when it names a
 * class we know, states a recognisable change, and gives a date the class
 * actually falls on — anything vaguer is left alone rather than guessed at.
 */
export function interpret(messages: Message[], data: PlannerData): Proposal[] {
  const out: Proposal[] = [];

  for (const msg of messages) {
    const text = `${msg.subject}\n${msg.body}`;

    // campus-wide holidays first: they need no class to match against
    const holiday = findHoliday(msg);
    if (holiday) {
      const already = data.holidays.some((h) => h.date === holiday.date);
      if (!already) {
        out.push({
          target: "holiday",
          id: `${msg.id}-holiday`,
          messageId: msg.id,
          date: holiday.date,
          label: holiday.label,
          evidence: evidenceForHoliday(msg.body.trim() || msg.subject),
          subject: msg.subject,
          from: msg.from,
          receivedAt: msg.date,
        });
      }
      continue;
    }

    const kind = classify(text);
    if (!kind) continue;

    const cls = matchClass(text, data.classes);
    if (!cls) continue;

    const received = new Date(msg.date);
    const date = findDate(text, received);
    if (!date) continue;

    // only trust it if the class really meets that weekday
    const [y, m, d] = date.split("-").map(Number);
    if (weekdayIndex(new Date(y, m - 1, d)) !== cls.day) continue;

    const time = kind === "moved" ? findTime(text) : null;
    const room = kind === "room" || kind === "moved" ? findRoom(text) : null;
    if (kind === "moved" && !time && !room) continue;
    if (kind === "room" && !room) continue;

    const length = minutesOf(cls.end) - minutesOf(cls.start);
    const end =
      time !== null
        ? `${pad(Math.floor((minutesOf(time) + length) / 60) % 24)}:${pad(
            (minutesOf(time) + length) % 60
          )}`
        : undefined;

    out.push({
      target: "class",
      id: `${msg.id}-${cls.id}`,
      messageId: msg.id,
      cls,
      date,
      kind,
      start: time ?? undefined,
      end,
      location: room ?? undefined,
      // quote the body, not the subject — the subject is shown alongside anyway
      evidence: evidenceFor(msg.body.trim() || msg.subject, kind),
      subject: msg.subject,
      from: msg.from,
      receivedAt: msg.date,
    });
  }

  // one proposal per target per date; the most recent mail wins
  const key = (p: Proposal) =>
    p.target === "holiday" ? `holiday-${p.date}` : `${p.cls.id}-${p.date}`;
  return out
    .sort((a, b) => b.receivedAt.localeCompare(a.receivedAt))
    .filter((p, i, all) => all.findIndex((o) => key(o) === key(p)) === i);
}

export function describeProposal(p: Proposal): string {
  if (p.target === "holiday") {
    return `${p.label} — holiday on ${p.date}`;
  }
  const when = `${DAY_NAMES[p.cls.day]} ${p.date}`;
  if (p.kind === "cancelled") return `${classLabel(p.cls)} cancelled on ${when}`;
  if (p.kind === "room")
    return `${classLabel(p.cls)} moves to ${p.location} on ${when}`;
  return `${classLabel(p.cls)} on ${when} moves to ${p.start}${
    p.end ? `–${p.end}` : ""
  }${p.location ? ` in ${p.location}` : ""}`;
}
