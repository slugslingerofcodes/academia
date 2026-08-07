"use client";

import { useCallback, useState } from "react";
import { CalendarSync, Check, RefreshCw, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { PlannerStore } from "@/lib/planner/use-planner";
import { LEAD_MINUTES } from "@/lib/planner/use-class-notifications";
import {
  isConfigured,
  localTimeZone,
  requestAccessToken,
  syncClasses,
  type SyncResult,
} from "@/lib/planner/google-calendar";
import { Panel } from "./ui";

type Status = "idle" | "working" | "done" | "error";

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

  if (!isConfigured()) return <SetupNotice />;

  const classCount = store.data.classes.length;

  return (
    <Panel title="Google Calendar sync" icon={<CalendarSync />}>
      <p className="text-sm text-muted">
        Write your classes straight into Google Calendar as weekly repeating
        events, each with a {LEAD_MINUTES}-minute reminder. Marked holidays are
        excluded automatically. Times use your {localTimeZone()} timezone.
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
        <div className="mt-4 rounded-xl border border-accent/40 bg-accent-faint p-4">
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

      {error && (
        <p className="mt-4 flex items-center gap-2 text-sm text-destructive">
          <TriangleAlert className="size-4" />
          {error}
        </p>
      )}
    </Panel>
  );
}
