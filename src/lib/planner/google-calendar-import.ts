import { BYDAY_INDEX, interpretSummary, type ImportResult } from "./ics-import";
import { ACADEMIA_MARK } from "./google-calendar";

/**
 * Reads weekly classes back *out* of Google Calendar, so sync runs both ways.
 *
 * The export side writes classes as weekly repeating events; this reverses
 * that, and also picks up classes added in Google Calendar directly or by a
 * university feed. Only weekly repeating events become classes — a one-off
 * meeting or an all-day entry isn't a timetable slot.
 *
 * Like the .ics import, this stops at a *proposal*. The calendar is shared with
 * whatever else writes to it, so it must not be able to rewrite the timetable
 * unattended.
 */

const API = "https://www.googleapis.com/calendar/v3/calendars/primary/events";

export interface CalendarEvent {
  id?: string;
  status?: string;
  summary?: string;
  location?: string;
  description?: string;
  start?: { dateTime?: string; date?: string };
  end?: { dateTime?: string; date?: string };
  recurrence?: string[];
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
 * An event Academia itself created.
 *
 * These are skipped rather than round-tripped. Re-importing our own export
 * would resurrect any class deleted here but still present in Google, since
 * sync never deletes remote events — the deletion would silently undo itself.
 */
export function isOwnEvent(event: CalendarEvent): boolean {
  return (
    event.description?.includes(ACADEMIA_MARK) === true ||
    event.id?.startsWith("academia") === true
  );
}

/** The RRULE line of a weekly event, or null when it isn't weekly. */
function weeklyRule(event: CalendarEvent): string | null {
  const rule = event.recurrence?.find((r) => r.toUpperCase().startsWith("RRULE:"));
  if (!rule) return null;
  const parts = Object.fromEntries(
    rule
      .slice(rule.indexOf(":") + 1)
      .split(";")
      .map((p) => {
        const [k, v] = p.split("=");
        return [k.toUpperCase(), v ?? ""];
      })
  );
  return (parts.FREQ ?? "").toUpperCase() === "WEEKLY" ? rule : null;
}

/**
 * Turn Google's event JSON into weekly classes.
 *
 * `start.dateTime` is RFC3339 with an offset, so `new Date` resolves it to the
 * viewer's own wall clock — which is what a timetable should show.
 */
export function eventsToClasses(events: CalendarEvent[]): ImportResult {
  const result: ImportResult = { classes: [], skipped: 0, warnings: [] };

  for (const event of events) {
    if (event.status === "cancelled" || isOwnEvent(event)) {
      result.skipped++;
      continue;
    }

    // all-day entries carry `date`, not `dateTime` — holidays, not classes
    if (!event.start?.dateTime) {
      result.skipped++;
      continue;
    }

    const rule = weeklyRule(event);
    if (!rule) {
      result.skipped++;
      continue;
    }

    const start = new Date(event.start.dateTime);
    if (Number.isNaN(start.getTime())) {
      result.skipped++;
      continue;
    }

    const parsedEnd = event.end?.dateTime ? new Date(event.end.dateTime) : null;
    const end =
      parsedEnd && !Number.isNaN(parsedEnd.getTime()) && parsedEnd > start
        ? parsedEnd
        : new Date(start.getTime() + 60 * 60000);

    const { code, title, type } = interpretSummary(event.summary ?? "Untitled class");

    // BYDAY may name several days; otherwise the event's own weekday
    let days = [weekdayOf(start)];
    const byday = rule.match(/BYDAY=([^;]+)/i);
    if (byday) {
      const mapped = byday[1]
        .split(",")
        .map((d) => BYDAY_INDEX[d.trim().slice(-2).toUpperCase()])
        .filter((d): d is number => d !== undefined);
      if (mapped.length > 0) days = mapped;
    }

    for (const day of days) {
      result.classes.push({
        code,
        title,
        type,
        day,
        start: hhmm(start),
        end: hhmm(end),
        location: event.location?.trim() || undefined,
      });
    }
  }

  return result;
}

async function readError(res: Response): Promise<string> {
  try {
    const body = (await res.json()) as { error?: { message?: string } };
    return body.error?.message ?? `HTTP ${res.status}`;
  } catch {
    return `HTTP ${res.status}`;
  }
}

/**
 * Fetch recurring events from the primary calendar.
 *
 * `singleEvents=false` keeps repeating events as their master entry, so one
 * weekly class arrives once with its RRULE intact rather than as hundreds of
 * separate occurrences.
 */
export async function fetchCalendarClasses(token: string): Promise<ImportResult> {
  const params = new URLSearchParams({
    singleEvents: "false",
    showDeleted: "false",
    maxResults: "250",
  });

  const events: CalendarEvent[] = [];
  let pageToken: string | undefined;

  do {
    if (pageToken) params.set("pageToken", pageToken);
    const res = await fetch(`${API}?${params}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error(await readError(res));
    const body = (await res.json()) as {
      items?: CalendarEvent[];
      nextPageToken?: string;
    };
    events.push(...(body.items ?? []));
    pageToken = body.nextPageToken;
  } while (pageToken && events.length < 1000);

  const result = eventsToClasses(events);
  if (result.classes.length === 0 && events.length > 0) {
    result.warnings.push(
      "No weekly classes found — Academia reads repeating events, so one-off entries and all-day events are left alone."
    );
  }
  return result;
}
