"use client";

import { useCallback, useState } from "react";
import {
  CalendarSync,
  Check,
  CloudDownload,
  RefreshCw,
  Trash2,
  TriangleAlert,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { PlannerStore } from "@/lib/planner/use-planner";
import { LEAD_MINUTES } from "@/lib/planner/use-class-notifications";
import { CLASS_HUES, CLASS_TYPE_LABEL } from "@/lib/planner/types";
import { DAY_NAMES, uid } from "@/lib/planner/schedule";
import { isDuplicate, type ParsedClass } from "@/lib/planner/ics-import";
import {
  fetchCalendarClasses,
  fetchEvents,
  findOrphanedEvents,
  type CalendarEvent,
} from "@/lib/planner/google-calendar-import";
import {
  deleteEvents,
  isConfigured,
  localTimeZone,
  requestAccessToken,
  syncClasses,
  type DeleteResult,
  type SyncResult,
} from "@/lib/planner/google-calendar";
import { Panel } from "./ui";

type Status = "idle" | "working" | "done" | "error";

interface Incoming {
  fresh: ParsedClass[];
  duplicates: number;
  skipped: number;
  warnings: string[];
}

function SetupNotice() {
  return (
    <Panel title="Google Calendar sync" icon={<CalendarSync />}>
      <p className="text-sm text-muted">
        Direct sync writes your classes straight into Google Calendar, so they
        appear on your phone and laptop without importing a file. It needs a
        Google OAuth client ID, which only you can create — it takes a couple of
        minutes:
      </p>
      <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm text-foreground/85">
        <li>
          In the Google Cloud console, create a project and enable the
          <span className="font-medium"> Google Calendar API</span>.
        </li>
        <li>
          Configure the OAuth consent screen (External), and add yourself as a
          test user.
        </li>
        <li>
          Create an <span className="font-medium">OAuth client ID</span> of type
          Web application, with this site&apos;s URL as an authorised JavaScript
          origin.
        </li>
        <li>
          Set it as <code className="text-accent">NEXT_PUBLIC_GOOGLE_CLIENT_ID</code> in
          your Vercel environment variables and redeploy.
        </li>
      </ol>
      <p className="mt-3 text-xs text-muted">
        The client ID is public by design — there is no secret to leak. Until
        it&apos;s set, use the calendar file export below, which needs no setup.
      </p>
    </Panel>
  );
}

export function GoogleCalendarPanel({ store }: { store: PlannerStore }) {
  const [status, setStatus] = useState<Status>("idle");
  const [result, setResult] = useState<SyncResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [pulling, setPulling] = useState(false);
  const [incoming, setIncoming] = useState<Incoming | null>(null);
  const [imported, setImported] = useState<number | null>(null);

  const sync = useCallback(async () => {
    setStatus("working");
    setError(null);
    setResult(null);
    try {
      const token = await requestAccessToken();
      const res = await syncClasses(store.data, token, LEAD_MINUTES);
      setResult(res);
      setStatus(res.failed.length > 0 && res.created + res.updated === 0 ? "error" : "done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sync failed.");
      setStatus("error");
    }
  }, [store.data]);

  const pull = useCallback(async () => {
    setPulling(true);
    setError(null);
    setImported(null);
    setIncoming(null);
    try {
      const token = await requestAccessToken();
      const found = await fetchCalendarClasses(token);
      const existing = store.data.classes;
      const fresh: ParsedClass[] = [];
      let duplicates = 0;
      for (const c of found.classes) {
        if (isDuplicate(c, existing) || isDuplicate(c, fresh)) duplicates++;
        else fresh.push(c);
      }
      setIncoming({
        fresh,
        duplicates,
        skipped: found.skipped,
        warnings: found.warnings,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't read your calendar.");
    } finally {
      setPulling(false);
    }
  }, [store.data.classes]);

  const [sweeping, setSweeping] = useState(false);
  const [orphans, setOrphans] = useState<CalendarEvent[] | null>(null);
  const [removed, setRemoved] = useState<DeleteResult | null>(null);

  const findLeftovers = useCallback(async () => {
    setSweeping(true);
    setError(null);
    setRemoved(null);
    setOrphans(null);
    try {
      const token = await requestAccessToken();
      const events = await fetchEvents(token);
      setOrphans(findOrphanedEvents(events, store.data.classes));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't read your calendar.");
    } finally {
      setSweeping(false);
    }
  }, [store.data.classes]);

  const removeLeftovers = useCallback(async () => {
    if (!orphans || orphans.length === 0) return;
    setSweeping(true);
    setError(null);
    try {
      const token = await requestAccessToken();
      const res = await deleteEvents(
        token,
        orphans.map((e) => ({ id: e.id!, label: e.summary ?? "Untitled event" }))
      );
      setRemoved(res);
      setOrphans(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't delete those events.");
    } finally {
      setSweeping(false);
    }
  }, [orphans]);

  const applyIncoming = () => {
    if (!incoming) return;
    store.addClasses(
      incoming.fresh.map((c) => ({
        id: uid(),
        code: c.code,
        title: c.title,
        type: c.type,
        day: c.day,
        start: c.start,
        end: c.end,
        location: c.location,
        hue: CLASS_HUES[0],
      }))
    );
    setImported(incoming.fresh.length);
    setIncoming(null);
  };

  if (!isConfigured()) return <SetupNotice />;

  const classCount = store.data.classes.length;

  return (
    <Panel title="Google Calendar sync" icon={<CalendarSync />}>
      <p className="text-sm text-muted">
        Sync runs both ways. <span className="font-medium text-foreground">Push</span> writes
        your classes into Google Calendar as weekly repeating events, each with
        a {LEAD_MINUTES}-minute reminder, with marked holidays excluded.{" "}
        <span className="font-medium text-foreground">Pull</span> reads weekly
        events back, so classes added in Google Calendar or by a university feed
        land here too. Times use your {localTimeZone()} timezone.
      </p>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <span className="text-sm text-muted">
          {classCount === 0
            ? "No classes to sync yet."
            : `${classCount} class${classCount === 1 ? "" : "es"} ready.`}
        </span>
        <Button
          className="rounded-full px-5"
          disabled={classCount === 0 || status === "working"}
          onClick={sync}
        >
          <RefreshCw data-icon="inline-start" />
          {status === "working" ? "Syncing…" : "Sync to Google Calendar"}
        </Button>
      </div>

      {result && (
        <div role="status" className="mt-4 rounded-xl border border-accent/40 bg-accent-faint p-4">
          <p className="flex items-center gap-2 text-sm font-medium text-accent">
            <Check className="size-4" />
            {result.created} added, {result.updated} updated.
          </p>
          {result.failed.length > 0 && (
            <ul className="mt-2 list-disc space-y-0.5 pl-5 text-sm text-destructive">
              {result.failed.map((f) => (
                <li key={f.label}>
                  {f.label}: {f.reason}
                </li>
              ))}
            </ul>
          )}
          <p className="mt-2 text-xs text-muted">
            Syncing again updates these same events rather than duplicating them.
          </p>
        </div>
      )}

      <div className="mt-5 border-t border-border pt-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="text-sm text-muted">
            Bring classes in from Google Calendar.
          </span>
          <Button
            variant="outline"
            className="rounded-full px-5"
            disabled={pulling}
            onClick={pull}
          >
            <CloudDownload data-icon="inline-start" />
            {pulling ? "Reading…" : "Import from Google Calendar"}
          </Button>
        </div>

        {incoming && (
          <div className="mt-4 rounded-xl border border-border bg-background/40 p-4">
            {incoming.fresh.length === 0 ? (
              <p className="text-sm text-muted">
                Nothing new to add
                {incoming.duplicates > 0 &&
                  ` — ${incoming.duplicates} already in your timetable`}
                .
              </p>
            ) : (
              <>
                <p className="text-sm font-medium text-foreground">
                  {incoming.fresh.length} class
                  {incoming.fresh.length === 1 ? "" : "es"} found
                  {incoming.duplicates > 0 &&
                    `, ${incoming.duplicates} already yours`}
                  .
                </p>
                <ul className="mt-2 space-y-1 text-sm text-muted">
                  {incoming.fresh.slice(0, 8).map((c, i) => (
                    <li key={`${c.title}-${c.day}-${c.start}-${i}`}>
                      {DAY_NAMES[c.day]} {c.start}–{c.end} ·{" "}
                      {c.code ? `${c.code} — ` : ""}
                      {c.title} ({CLASS_TYPE_LABEL[c.type]})
                      {c.location ? ` · ${c.location}` : ""}
                    </li>
                  ))}
                  {incoming.fresh.length > 8 && (
                    <li>…and {incoming.fresh.length - 8} more</li>
                  )}
                </ul>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <Button
                    size="sm"
                    className="rounded-full px-4"
                    onClick={applyIncoming}
                  >
                    <Check data-icon="inline-start" />
                    Add to my timetable
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-muted hover:text-foreground"
                    onClick={() => setIncoming(null)}
                  >
                    Discard
                  </Button>
                </div>
              </>
            )}
            {incoming.warnings.map((w) => (
              <p key={w} className="mt-2 text-xs text-muted">
                {w}
              </p>
            ))}
            {incoming.skipped > 0 && (
              <p className="mt-2 text-xs text-muted">
                {incoming.skipped} event{incoming.skipped === 1 ? "" : "s"} left
                alone — one-off entries, all-day events, and the ones Academia
                wrote itself.
              </p>
            )}
          </div>
        )}

        {imported !== null && (
          <p role="status" className="mt-4 flex items-center gap-2 text-sm font-medium text-accent">
            <Check className="size-4" />
            Added {imported} class{imported === 1 ? "" : "es"} to your timetable.
          </p>
        )}

        <p className="mt-3 text-xs text-muted">
          Nothing is added until you confirm — your calendar is shared with
          whatever else writes to it, so it doesn&apos;t get to change your
          timetable on its own. Events Academia created are skipped, so a class
          you deleted here isn&apos;t resurrected by its leftover copy.
        </p>
      </div>

      <div className="mt-5 border-t border-border pt-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="text-sm text-muted">
            Delete a class here and its calendar event stays behind — sync only
            adds and updates. This finds those leftovers.
          </span>
          <Button
            variant="outline"
            className="rounded-full px-5"
            disabled={sweeping}
            onClick={findLeftovers}
          >
            <Trash2 data-icon="inline-start" />
            {sweeping ? "Working…" : "Find leftover events"}
          </Button>
        </div>

        {orphans !== null && orphans.length === 0 && (
          <p className="mt-4 text-sm text-muted">
            Nothing left over — every Academia event on your calendar still has
            a class here.
          </p>
        )}

        {orphans !== null && orphans.length > 0 && (
          <div className="mt-4 rounded-xl border border-destructive/40 bg-destructive/5 p-4">
            <p className="text-sm font-medium text-foreground">
              {orphans.length} event{orphans.length === 1 ? "" : "s"} Academia
              created, with no matching class here:
            </p>
            <ul className="mt-2 list-disc space-y-0.5 pl-5 text-sm text-muted">
              {orphans.slice(0, 10).map((e) => (
                <li key={e.id}>{e.summary ?? "Untitled event"}</li>
              ))}
              {orphans.length > 10 && <li>…and {orphans.length - 10} more</li>}
            </ul>

            <p className="mt-3 flex gap-2 text-xs text-warn">
              <TriangleAlert className="mt-0.5 size-3.5 shrink-0" />
              <span>
                This device&apos;s timetable is the reference. If a class exists
                only on another device and hasn&apos;t synced here yet, its
                event will look leftover — sync your devices first, or you
                &apos;ll delete an event you still want. Deleting a repeating
                event removes the whole series, and Google Calendar can restore
                it from its bin for 30 days.
              </span>
            </p>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Button
                size="sm"
                variant="destructive"
                className="rounded-full px-4"
                disabled={sweeping}
                onClick={removeLeftovers}
              >
                <Trash2 data-icon="inline-start" />
                {sweeping
                  ? "Deleting…"
                  : `Delete ${orphans.length} event${orphans.length === 1 ? "" : "s"}`}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-muted hover:text-foreground"
                disabled={sweeping}
                onClick={() => setOrphans(null)}
              >
                Keep them
              </Button>
            </div>
          </div>
        )}

        {removed && (
          <div role="status" className="mt-4">
            <p className="flex items-center gap-2 text-sm font-medium text-accent">
              <Check className="size-4" />
              Deleted {removed.deleted} event{removed.deleted === 1 ? "" : "s"}.
            </p>
            {removed.failed.length > 0 && (
              <ul className="mt-2 list-disc space-y-0.5 pl-5 text-sm text-destructive">
                {removed.failed.map((f) => (
                  <li key={f.label}>
                    {f.label}: {f.reason}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      {error && (
        <p role="alert" className="mt-4 flex items-center gap-2 text-sm text-destructive">
          <TriangleAlert className="size-4" />
          {error}
        </p>
      )}
    </Panel>
  );
}
