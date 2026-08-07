"use client";

import { useState } from "react";
import { CalendarSync, Download, ExternalLink, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { PlannerStore } from "@/lib/planner/use-planner";
import { buildIcs, countEvents, downloadIcs, type IcsOptions } from "@/lib/planner/ics";
import { LEAD_MINUTES } from "@/lib/planner/use-class-notifications";
import { Panel } from "./ui";

const GOOGLE_IMPORT_URL = "https://calendar.google.com/calendar/r/settings/import";

const TOGGLES = [
  { key: "includeClasses", label: "Weekly classes" },
  { key: "includeSessions", label: "Unfinished work sessions" },
  { key: "includeHolidays", label: "Holidays" },
] as const;

export function CalendarSyncPanel({ store }: { store: PlannerStore }) {
  const [options, setOptions] = useState<IcsOptions>({
    includeClasses: true,
    includeSessions: true,
    includeHolidays: true,
    leadMinutes: LEAD_MINUTES,
  });
  const [done, setDone] = useState(false);

  const total = countEvents(store.data, options);

  const exportFile = () => {
    downloadIcs(buildIcs(store.data, options));
    setDone(true);
  };

  return (
    <Panel title="Add to Google Calendar" icon={<CalendarSync />}>
      <p className="text-sm text-muted">
        Download your timetable as a calendar file, then import it into Google Calendar
        once. It syncs to Google&apos;s app on your phone and laptop automatically, and
        each class carries a {LEAD_MINUTES}-minute reminder — so you get alerts even when
        Academia isn&apos;t open.
      </p>

      <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2">
        {TOGGLES.map((t) => (
          <label key={t.key} className="flex cursor-pointer items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="size-4 accent-[var(--accent)]"
              checked={options[t.key]}
              onChange={(e) => {
                setOptions((o) => ({ ...o, [t.key]: e.target.checked }));
                setDone(false);
              }}
            />
            {t.label}
          </label>
        ))}
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <span className="text-sm text-muted">
          {total === 0
            ? "Nothing to export yet — add a class first."
            : `${total} event${total === 1 ? "" : "s"} ready to export.`}
        </span>
        <Button className="rounded-full px-5" disabled={total === 0} onClick={exportFile}>
          <Download data-icon="inline-start" />
          Download calendar file
        </Button>
      </div>

      {done && (
        <div className="mt-4 rounded-xl border border-accent/40 bg-accent-faint p-4">
          <p className="text-sm font-medium text-accent">
            Downloaded academia.ics — now import it into Google Calendar:
          </p>
          <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-foreground/85">
            <li>Open Google Calendar&apos;s import page and pick the file.</li>
            <li>Choose which calendar to add the events to, then press Import.</li>
            <li>
              <span className="inline-flex items-center gap-1.5">
                <Smartphone className="size-3.5" />
                They appear on your phone automatically once Google syncs.
              </span>
            </li>
          </ol>
          <a
            href={GOOGLE_IMPORT_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-accent hover:underline"
          >
            Open Google Calendar import
            <ExternalLink className="size-3.5" />
          </a>
        </div>
      )}

      <p className="mt-3 text-xs text-muted">
        This is a one-way snapshot — after you change your timetable, export again and
        re-import to refresh it.
      </p>
    </Panel>
  );
}
