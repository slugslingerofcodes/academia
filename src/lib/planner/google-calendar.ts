import type { ClassEntry, ClassException, Holiday, PlannerData } from "./types";
import { classLabel, CLASS_TYPE_LABEL } from "./types";
import {
  currentWeekDates,
  minutesOf,
  parseDateKey,
  weekdayIndex,
} from "./schedule";

/**
 * Direct Google Calendar sync, entirely from the browser.
 *
 * Uses Google Identity Services' token flow, which needs only a public OAuth
 * **client ID** — no client secret and no backend, so it works on a static
 * site. Supply the ID as NEXT_PUBLIC_GOOGLE_CLIENT_ID; without it the feature
 * reports itself as unconfigured and the .ics export remains the fallback.
 */

const GIS_SRC = "https://accounts.google.com/gsi/client";
export const CALENDAR_SCOPE = "https://www.googleapis.com/auth/calendar.events";
/** Google's per-app hidden folder — cannot see any of the user's other files. */
export const DRIVE_SCOPE = "https://www.googleapis.com/auth/drive.appdata";
const API = "https://www.googleapis.com/calendar/v3/calendars/primary/events";
const BYDAY = ["MO", "TU", "WE", "TH", "FR", "SA", "SU"] as const;

/**
 * Stamped on every event this app writes. The import side reads it to tell our
 * own events apart from ones added in Google Calendar directly.
 */
export const ACADEMIA_MARK = "Added by Academia";

export const CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? "";
export const isConfigured = () => CLIENT_ID.length > 0;

export function localTimeZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
}

/* ---- Google Identity Services ---- */

interface TokenResponse {
  access_token?: string;
  error?: string;
}
interface TokenClient {
  requestAccessToken: (opts?: { prompt?: string }) => void;
}
interface GoogleGsi {
  accounts: {
    oauth2: {
      initTokenClient: (config: {
        client_id: string;
        scope: string;
        callback: (r: TokenResponse) => void;
      }) => TokenClient;
      revoke: (token: string, done?: () => void) => void;
    };
  };
}

declare global {
  interface Window {
    google?: GoogleGsi;
  }
}

let gisPromise: Promise<void> | null = null;

function loadGis(): Promise<void> {
  if (window.google?.accounts?.oauth2) return Promise.resolve();
  if (gisPromise) return gisPromise;
  gisPromise = new Promise((resolve, reject) => {
    const el = document.createElement("script");
    el.src = GIS_SRC;
    el.async = true;
    el.onload = () => resolve();
    el.onerror = () => {
      gisPromise = null;
      reject(new Error("Could not load Google sign-in."));
    };
    document.head.appendChild(el);
  });
  return gisPromise;
}

/**
 * Opens Google's consent popup and resolves with an access token.
 *
 * The scope is passed in so each feature asks only for what it needs — using
 * calendar sync never requests access to Drive, and vice versa.
 */
export async function requestAccessToken(
  scope: string = CALENDAR_SCOPE,
  options: { silent?: boolean } = {}
): Promise<string> {
  if (!isConfigured()) throw new Error("Google client ID is not configured.");
  await loadGis();
  const oauth2 = window.google?.accounts.oauth2;
  if (!oauth2) throw new Error("Google sign-in is unavailable.");

  return new Promise((resolve, reject) => {
    const client = oauth2.initTokenClient({
      client_id: CLIENT_ID,
      scope,
      callback: (res) => {
        if (res.error || !res.access_token) {
          reject(new Error(res.error ?? "Google sign-in was cancelled."));
          return;
        }
        resolve(res.access_token);
      },
    });
    // prompt:'' reuses an existing grant without any UI; it fails rather than
    // showing a popup, which is what background syncing wants
    client.requestAccessToken(options.silent ? { prompt: "" } : undefined);
  });
}

export async function revokeAccessToken(token: string): Promise<void> {
  await loadGis();
  window.google?.accounts.oauth2.revoke(token);
}

/* ---- event mapping ---- */

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

/** YYYYMMDDTHHMMSS in local wall-clock terms. */
function stamp(d: Date): string {
  return (
    `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}` +
    `T${pad(d.getHours())}${pad(d.getMinutes())}00`
  );
}

/** RFC3339 without an offset; the event carries an explicit timeZone. */
function rfc3339(d: Date): string {
  return (
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` +
    `T${pad(d.getHours())}:${pad(d.getMinutes())}:00`
  );
}

/**
 * Google event IDs allow only characters a-v and 0-9. Our ids are UUIDs
 * (hex, already valid once dashes go) but map anything else into range so a
 * fallback id can never produce an invalid request.
 */
export function toEventId(id: string): string {
  const mapped = id
    .toLowerCase()
    .split("")
    .filter((c) => c !== "-")
    .map((c) => (/[0-9a-v]/.test(c) ? c : String(c.charCodeAt(0) % 10)))
    .join("");
  return `academia${mapped}`.slice(0, 100);
}

function slotTimes(cls: ClassEntry, now: Date) {
  const anchor = parseDateKey(currentWeekDates(now)[cls.day]);
  const s = minutesOf(cls.start);
  const e = minutesOf(cls.end);
  const start = new Date(anchor);
  start.setHours(Math.floor(s / 60), s % 60, 0, 0);
  const end = new Date(anchor);
  end.setHours(Math.floor(e / 60), e % 60, 0, 0);
  return { start, end };
}

export function classToEvent(
  cls: ClassEntry,
  holidays: Holiday[],
  leadMinutes: number,
  now = new Date(),
  exceptions: ClassException[] = []
) {
  const { start, end } = slotTimes(cls, now);
  const tz = localTimeZone();

  const recurrence: string[] = [`RRULE:FREQ=WEEKLY;BYDAY=${BYDAY[cls.day]}`];
  const atClassTime = (dateKey: string) => {
    const d = parseDateKey(dateKey);
    const s = minutesOf(cls.start);
    d.setHours(Math.floor(s / 60), s % 60, 0, 0);
    return stamp(d);
  };

  const holidayDates = holidays
    .filter((h) => weekdayIndex(parseDateKey(h.date)) === cls.day)
    .map((h) => atClassTime(h.date));

  // one-off cancellations and reschedules drop out of the weekly series too
  const exceptionDates = exceptions
    .filter((x) => x.classId === cls.id)
    .map((x) => atClassTime(x.date));

  const exdates = [...new Set([...holidayDates, ...exceptionDates])];
  if (exdates.length > 0) {
    recurrence.push(`EXDATE;TZID=${tz}:${exdates.join(",")}`);
  }

  return {
    id: toEventId(cls.id),
    summary: `${classLabel(cls)} (${CLASS_TYPE_LABEL[cls.type]})`,
    ...(cls.location ? { location: cls.location } : {}),
    description: ACADEMIA_MARK,
    start: { dateTime: rfc3339(start), timeZone: tz },
    end: { dateTime: rfc3339(end), timeZone: tz },
    recurrence,
    reminders: {
      useDefault: false,
      overrides: [{ method: "popup", minutes: leadMinutes }],
    },
  };
}

/* ---- sync ---- */

export interface SyncResult {
  created: number;
  updated: number;
  failed: { label: string; reason: string }[];
}

async function readError(res: Response): Promise<string> {
  try {
    const body = (await res.json()) as { error?: { message?: string } };
    return body.error?.message ?? `HTTP ${res.status}`;
  } catch {
    return `HTTP ${res.status}`;
  }
}

export interface DeleteResult {
  deleted: number;
  failed: { label: string; reason: string }[];
}

/**
 * Delete events by id.
 *
 * The only destructive call in the app, so it deletes exactly the ids it is
 * given and works nothing out for itself — deciding what deserves deleting is
 * the caller's job, and the user confirms that list first.
 *
 * A 404 or 410 counts as success: the event is already gone, which is the
 * outcome being asked for.
 */
export async function deleteEvents(
  token: string,
  events: { id: string; label: string }[]
): Promise<DeleteResult> {
  const result: DeleteResult = { deleted: 0, failed: [] };
  const headers = { Authorization: `Bearer ${token}` };

  for (const { id, label } of events) {
    try {
      const res = await fetch(`${API}/${encodeURIComponent(id)}`, {
        method: "DELETE",
        headers,
      });
      if (res.ok || res.status === 404 || res.status === 410) {
        result.deleted++;
        continue;
      }
      result.failed.push({ label, reason: await readError(res) });
    } catch (err) {
      result.failed.push({
        label,
        reason: err instanceof Error ? err.message : "Network error",
      });
    }
  }
  return result;
}

/**
 * Push every class to the user's primary calendar. Event IDs are derived from
 * our own ids, so re-running updates the same events instead of duplicating.
 */
export async function syncClasses(
  data: PlannerData,
  token: string,
  leadMinutes: number
): Promise<SyncResult> {
  const result: SyncResult = { created: 0, updated: 0, failed: [] };
  const headers = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };

  for (const cls of data.classes) {
    const event = classToEvent(
      cls,
      data.holidays,
      leadMinutes,
      new Date(),
      data.exceptions
    );
    try {
      const res = await fetch(API, {
        method: "POST",
        headers,
        body: JSON.stringify(event),
      });

      if (res.ok) {
        result.created++;
        continue;
      }

      // 409 means we've synced this class before — update it in place
      if (res.status === 409) {
        const put = await fetch(`${API}/${event.id}`, {
          method: "PUT",
          headers,
          body: JSON.stringify(event),
        });
        if (put.ok) result.updated++;
        else
          result.failed.push({
            label: classLabel(cls),
            reason: await readError(put),
          });
        continue;
      }

      result.failed.push({ label: classLabel(cls), reason: await readError(res) });
    } catch (err) {
      result.failed.push({
        label: classLabel(cls),
        reason: err instanceof Error ? err.message : "Network error",
      });
    }
  }

  return result;
}
