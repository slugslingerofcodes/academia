"use client";

import { useMemo, useState } from "react";
import { CalendarRange, CircleAlert, TreePalm } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PlannerStore } from "@/lib/planner/use-planner";
import { CLASS_TYPE_LABEL, classDetails, classLabel } from "@/lib/planner/types";
import { DAY_NAMES, formatDateKey } from "@/lib/planner/schedule";
import {
  buildAgenda,
  isEmptyDay,
  weekTotals,
  type AgendaDay,
  type AgendaWeek,
} from "@/lib/planner/agenda";
import { EmptyState, Panel } from "./ui";

const RANGES = [2, 4, 8] as const;

function Totals({ week }: { week: AgendaWeek }) {
  const t = weekTotals(week);
  const parts: string[] = [];
  if (t.classes > 0) parts.push(`${t.classes} class${t.classes === 1 ? "" : "es"}`);
  if (t.sessions > 0)
    parts.push(`${t.sessions} work session${t.sessions === 1 ? "" : "s"}`);
  if (t.deadlines > 0)
    parts.push(`${t.deadlines} deadline${t.deadlines === 1 ? "" : "s"}`);
  if (t.holidays > 0) parts.push(`${t.holidays} holiday${t.holidays === 1 ? "" : "s"}`);
  return (
    <span className="text-xs text-muted">
      {parts.length > 0 ? parts.join(" · ") : "Nothing scheduled"}
    </span>
  );
}

function ClassesCell({ day }: { day: AgendaDay }) {
  if (day.holiday) {
    return (
      <span className="flex items-center gap-1.5 text-accent">
        <TreePalm className="size-3.5 shrink-0" />
        {day.holiday.label ?? "Holiday"} — no classes
      </span>
    );
  }
  if (day.classes.length === 0) {
    return <span className="text-muted/60">—</span>;
  }
  return (
    <ul className="flex flex-col gap-1">
      {day.classes.map((c) => (
        <li
          key={c.cls.id}
          className={cn("flex flex-wrap items-baseline gap-x-2", c.cancelled && "opacity-60")}
        >
          <span
            className={cn(
              "tabular-nums text-muted",
              c.cancelled && "line-through"
            )}
          >
            {c.start}–{c.end}
          </span>
          <span className={cn("text-foreground", c.cancelled && "line-through")}>
            {classLabel(c.cls)}
          </span>
          <span className="text-xs text-muted">
            {CLASS_TYPE_LABEL[c.cls.type]}
            {c.location ? ` · ${c.location}` : ""}
            {classDetails(c.cls) ? ` · ${classDetails(c.cls)}` : ""}
          </span>
          {c.cancelled && (
            <span className="text-xs font-medium text-destructive">Cancelled</span>
          )}
          {c.moved && !c.cancelled && (
            <span className="text-xs font-medium text-warn">Rescheduled</span>
          )}
        </li>
      ))}
    </ul>
  );
}

function WorkCell({ day }: { day: AgendaDay }) {
  if (day.sessions.length === 0 && day.deadlines.length === 0) {
    return <span className="text-muted/60">—</span>;
  }
  return (
    <ul className="flex flex-col gap-1">
      {day.deadlines.map((d) => (
        <li key={`due-${d.id}`} className="flex flex-wrap items-baseline gap-x-2">
          <span className="flex items-center gap-1.5 text-xs font-medium text-destructive">
            <CircleAlert className="size-3.5 shrink-0" />
            Due
          </span>
          <span className="text-foreground">{d.name}</span>
        </li>
      ))}
      {day.sessions.map((s) => (
        <li
          key={`${s.projectId}-${s.label}`}
          className={cn("flex flex-wrap items-baseline gap-x-2", s.done && "opacity-55")}
        >
          <span className="tabular-nums text-muted">
            {s.start ? `${s.start}–${s.end}` : "anytime"}
          </span>
          <span className={cn("text-foreground", s.done && "line-through")}>
            {s.project}
          </span>
          <span className="text-xs text-muted">{s.label}</span>
          {s.done && <span className="text-xs font-medium text-accent">Done</span>}
        </li>
      ))}
    </ul>
  );
}

function WeekTable({ week }: { week: AgendaWeek }) {
  return (
    /* three columns of prose don't compress; let the table scroll rather than
       squeeze the page into a horizontal scroll of its own */
    <div className="overflow-x-auto">
      <table className="w-full min-w-[620px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs font-medium text-muted">
            <th scope="col" className="w-32 py-2 pr-4 font-medium">
              Day
            </th>
            <th scope="col" className="py-2 pr-4 font-medium">
              Classes
            </th>
            <th scope="col" className="py-2 font-medium">
              Tasks &amp; projects
            </th>
          </tr>
        </thead>
        <tbody>
          {week.days.map((day) => (
            <tr
              key={day.date}
              className={cn(
                "border-b border-border/60 align-top last:border-0",
                day.isPast && "opacity-55",
                day.isToday && "bg-accent-faint",
                isEmptyDay(day) && !day.isToday && "text-muted"
              )}
            >
              <th scope="row" className="py-2.5 pr-4 text-left font-normal">
                <span className="flex flex-wrap items-baseline gap-x-2">
                  <span className="font-medium text-foreground">
                    {DAY_NAMES[day.weekday]}
                  </span>
                  <span className="text-muted">{formatDateKey(day.date)}</span>
                  {day.isToday && (
                    <span className="text-xs font-semibold text-accent">Today</span>
                  )}
                </span>
              </th>
              <td className="py-2.5 pr-4">
                <ClassesCell day={day} />
              </td>
              <td className="py-2.5">
                <WorkCell day={day} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function UpcomingTab({ store }: { store: PlannerStore }) {
  const [weeks, setWeeks] = useState<number>(4);
  const [hideEmpty, setHideEmpty] = useState(true);

  const agenda = useMemo(
    () => buildAgenda(store.data, weeks),
    [store.data, weeks]
  );

  const shown = hideEmpty ? agenda.filter((w) => !w.empty) : agenda;
  const hidden = agenda.length - shown.length;

  const nothingAtAll =
    store.data.classes.length === 0 &&
    store.data.projects.length === 0 &&
    store.data.holidays.length === 0;

  if (nothingAtAll) {
    return (
      <EmptyState icon={<CalendarRange />}>
        Nothing to show yet — add a class, a task or a holiday and the weeks
        ahead will fill in here.
      </EmptyState>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-foreground">
          Classes, holidays and your own work, week by week
        </h2>
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-xs text-muted">
            <input
              type="checkbox"
              className="size-3.5 accent-[var(--accent)]"
              checked={hideEmpty}
              onChange={(e) => setHideEmpty(e.target.checked)}
            />
            Hide empty weeks
          </label>
          <div className="flex gap-1 rounded-full border border-border bg-secondary p-1">
            {RANGES.map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setWeeks(n)}
                className={cn(
                  "rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                  weeks === n
                    ? "bg-card text-accent shadow-[var(--shadow-raised)]"
                    : "text-muted hover:text-foreground"
                )}
              >
                {n} weeks
              </button>
            ))}
          </div>
        </div>
      </div>

      {shown.length === 0 ? (
        <EmptyState icon={<CalendarRange />}>
          Nothing scheduled in the next {weeks} weeks.
        </EmptyState>
      ) : (
        shown.map((week) => (
          <Panel key={week.start} className="overflow-hidden">
            <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
              <h3 className="text-sm font-semibold text-foreground">
                {formatDateKey(week.start)} — {formatDateKey(week.end)}
              </h3>
              <Totals week={week} />
            </div>
            <WeekTable week={week} />
          </Panel>
        ))
      )}

      {hidden > 0 && (
        <p className="text-xs text-muted">
          {hidden} empty week{hidden === 1 ? "" : "s"} hidden.
        </p>
      )}
    </div>
  );
}
