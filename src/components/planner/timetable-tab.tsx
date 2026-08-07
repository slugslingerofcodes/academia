"use client";

import { useEffect, useState } from "react";
import {
  BellRing,
  CalendarDays,
  Clock,
  LayoutGrid,
  List,
  Pencil,
  TriangleAlert,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { PlannerStore } from "@/lib/planner/use-planner";
import {
  CLASS_TYPE_LABEL,
  classLabel,
  type ClassEntry,
  type ClassType,
} from "@/lib/planner/types";
import { LEAD_MINUTES, type ClassAlerts } from "@/lib/planner/use-class-notifications";
import {
  DAY_NAMES,
  classesOnDay,
  currentWeekDates,
  formatDateKey,
  holidaySet,
  nextClass,
  toDateKey,
} from "@/lib/planner/schedule";
import {
  describeConflict,
  findClassConflicts,
  findSessionPileups,
} from "@/lib/planner/conflicts";
import { EmptyState, Field, Panel, inputCls } from "./ui";
import { ClassForm } from "./class-form";
import { TimetableGrid } from "./timetable-grid";
import { CalendarImportPanel } from "./calendar-import";
import { CalendarSyncPanel } from "./calendar-sync";
import { GoogleCalendarPanel } from "./google-calendar-panel";

/** Colour by what kind of session it is, so the week reads at a glance. */
const TYPE_COLOR: Record<ClassType, string> = {
  lecture: "var(--accent)",
  lab: "var(--info)",
  tutorial: "var(--warn)",
};

function AlertsPanel({ store, alerts }: { store: PlannerStore; alerts: ClassAlerts }) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);

  const upcoming = nextClass(store.data.classes, store.data.holidays, now);
  const todayIsHoliday = holidaySet(store.data.holidays).has(toDateKey(now));

  const status =
    alerts.permission === "granted"
      ? { label: "Reminders are on", cls: "text-accent" }
      : alerts.permission === "denied"
        ? { label: "Notifications are blocked in your browser settings", cls: "text-destructive" }
        : alerts.permission === "unsupported"
          ? { label: "Notifications aren't supported in this browser", cls: "text-destructive" }
          : { label: "Reminders are off", cls: "text-muted" };

  return (
    <Panel title={`Class reminders — ${LEAD_MINUTES} minutes before start`} icon={<BellRing />}>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <span className={cn("flex items-center gap-2 text-sm font-medium", status.cls)}>
            <span
              className={cn(
                "size-2 rounded-full",
                alerts.permission === "granted" ? "bg-accent" : "bg-muted/50"
              )}
            />
            {status.label}
          </span>
          <span className="text-sm text-muted">
            {todayIsHoliday
              ? "Today is a holiday — reminders are paused."
              : upcoming
                ? `Next up: ${classLabel(upcoming.cls)} · ${DAY_NAMES[upcoming.cls.day]} ${upcoming.cls.start} (in ${
                    upcoming.minutesUntil >= 60
                      ? `${Math.floor(upcoming.minutesUntil / 60)}h ${upcoming.minutesUntil % 60}m`
                      : `${upcoming.minutesUntil} min`
                  })`
                : "No classes coming up in the next 7 days."}
          </span>
          <span className="text-xs text-muted/80">
            Keep this app open in a browser tab for reminders to work.
          </span>
        </div>
        <div className="flex items-center gap-2">
          {alerts.permission === "default" && (
            <Button className="rounded-full px-5" onClick={alerts.request}>
              <BellRing data-icon="inline-start" />
              Turn on reminders
            </Button>
          )}
          {alerts.permission === "granted" && (
            <Button variant="outline" className="rounded-full px-5" onClick={alerts.test}>
              Send a test
            </Button>
          )}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-end justify-between gap-4 border-t border-border pt-4">
        <div className="flex flex-col gap-1">
          <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-foreground">
            <input
              type="checkbox"
              className="size-4 accent-[var(--accent)]"
              checked={store.data.settings.digestEnabled}
              onChange={(e) =>
                store.updateSettings({ digestEnabled: e.target.checked })
              }
            />
            Start-of-day summary
          </label>
          <span className="text-sm text-muted">
            One notification listing what&apos;s due that day — deadlines, work
            sessions and how many classes. On holidays it still reports
            deadlines, since those don&apos;t move for a day off.
          </span>
        </div>
        <Field label="Send at">
          <input
            className={cn(inputCls, "w-32")}
            type="time"
            value={store.data.settings.digestTime}
            disabled={!store.data.settings.digestEnabled}
            onChange={(e) => store.updateSettings({ digestTime: e.target.value })}
          />
        </Field>
      </div>
    </Panel>
  );
}

/** Surfaces timetable clashes and days carrying several projects at once. */
function ConflictPanel({ store }: { store: PlannerStore }) {
  const conflicts = findClassConflicts(store.data.classes);
  const pileups = findSessionPileups(store.data);
  if (conflicts.length === 0 && pileups.length === 0) return null;

  return (
    <div className="rounded-2xl border border-destructive/40 bg-destructive/5 p-4">
      <p className="flex items-center gap-2 text-sm font-medium text-destructive">
        <TriangleAlert className="size-4" />
        {conflicts.length > 0
          ? `${conflicts.length} timetable clash${conflicts.length === 1 ? "" : "es"}`
          : "Busy days ahead"}
      </p>

      {conflicts.length > 0 && (
        <ul className="mt-2 list-disc space-y-0.5 pl-5 text-sm text-foreground/85">
          {conflicts.map((c, i) => (
            <li key={i}>{describeConflict(c)}</li>
          ))}
        </ul>
      )}

      {pileups.length > 0 && (
        <p className="mt-2 text-sm text-muted">
          {pileups.length === 1
            ? "1 day carries"
            : `${pileups.length} days carry`}{" "}
          work sessions from more than one project — first is{" "}
          {formatDateKey(pileups[0].date)} ({pileups[0].projects.join(", ")}).
        </p>
      )}
    </div>
  );
}

function WeekGrid({
  store,
  onEdit,
}: {
  store: PlannerStore;
  onEdit: (cls: ClassEntry) => void;
}) {
  const { classes, holidays } = store.data;
  const week = currentWeekDates();
  const todayKey = toDateKey(new Date());
  const skip = holidaySet(holidays);

  if (classes.length === 0) {
    return (
      <EmptyState icon={<CalendarDays />}>
        Your timetable is empty — add your first class above.
      </EmptyState>
    );
  }

  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-7">
      {week.map((dateKey, dayIdx) => {
        const isToday = dateKey === todayKey;
        const isHoliday = skip.has(dateKey);
        const dayClasses = classesOnDay(classes, dayIdx);
        return (
          <div
            key={dateKey}
            className={cn(
              "flex min-h-40 flex-col rounded-2xl border bg-card p-3 shadow-[var(--shadow-card)]",
              isToday ? "border-accent ring-2 ring-ring/30" : "border-border"
            )}
          >
            <div className="mb-2.5 flex items-center justify-between border-b border-border pb-2.5">
              <span
                className={cn(
                  "text-sm font-semibold",
                  isToday ? "text-accent" : "text-foreground"
                )}
              >
                {DAY_NAMES[dayIdx]}
                <span className="ml-1.5 text-xs font-normal text-muted">
                  {formatDateKey(dateKey)}
                </span>
              </span>
              {isToday && <Badge className="bg-accent text-primary-foreground">Today</Badge>}
            </div>

            {isHoliday && (
              <span className="mb-2 rounded-lg bg-destructive/10 px-2.5 py-1.5 text-center text-xs font-medium text-destructive">
                Holiday 🎉
              </span>
            )}

            <div className="flex flex-col gap-2">
              {dayClasses.length === 0 && !isHoliday && (
                <span className="py-4 text-center text-xs text-muted/60">Free day</span>
              )}
              {dayClasses.map((cls) => (
                <div
                  key={cls.id}
                  className={cn(
                    "group relative rounded-lg border border-border border-l-4 bg-background px-3 py-2",
                    isHoliday && "opacity-50"
                  )}
                  style={{ borderLeftColor: TYPE_COLOR[cls.type] }}
                >
                  {cls.code && (
                    <div className="text-xs font-semibold text-muted">{cls.code}</div>
                  )}
                  <div
                    className={cn(
                      "pr-5 text-sm font-medium text-foreground",
                      isHoliday && "line-through"
                    )}
                  >
                    {cls.title}
                  </div>
                  <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-muted">
                    <span
                      className="rounded px-1.5 py-0.5 text-[11px] font-medium"
                      style={{
                        color: TYPE_COLOR[cls.type],
                        backgroundColor: "color-mix(in srgb, currentColor 12%, transparent)",
                      }}
                    >
                      {CLASS_TYPE_LABEL[cls.type]}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Clock className="size-3" />
                      {cls.start}–{cls.end}
                    </span>
                    {cls.location && <span>· {cls.location}</span>}
                  </div>
                  {/* always visible: on a touch screen there is no hover, so
                      hiding these behind :hover made them unreachable on phones */}
                  <span className="absolute top-1.5 right-1.5 flex items-center gap-0.5">
                    <button
                      type="button"
                      aria-label={`Edit ${classLabel(cls)}`}
                      className="rounded p-1 text-muted/70 hover:bg-accent-faint hover:text-accent"
                      onClick={() => onEdit(cls)}
                    >
                      <Pencil className="size-3.5" />
                    </button>
                    <button
                      type="button"
                      aria-label={`Remove ${classLabel(cls)}`}
                      className="rounded p-1 text-muted/70 hover:bg-destructive/10 hover:text-destructive"
                      onClick={() => store.removeClass(cls.id)}
                    >
                      <X className="size-3.5" />
                    </button>
                  </span>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

const VIEWS = [
  { id: "chart", label: "Chart", icon: LayoutGrid },
  { id: "cards", label: "List", icon: List },
] as const;

type ViewId = (typeof VIEWS)[number]["id"];

export function TimetableTab({ store, alerts }: { store: PlannerStore; alerts: ClassAlerts }) {
  const [editingClass, setEditingClass] = useState<ClassEntry | null>(null);
  const [view, setView] = useState<ViewId>("chart");

  const edit = (cls: ClassEntry) => {
    setEditingClass(cls);
    document.getElementById("class-form")?.scrollIntoView({ behavior: "smooth" });
  };

  const hasClasses = store.data.classes.length > 0;

  return (
    <div className="flex flex-col gap-5">
      <AlertsPanel store={store} alerts={alerts} />
      <ConflictPanel store={store} />

      {hasClasses && (
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-foreground">This week</h2>
          <div className="flex gap-1 rounded-full border border-border bg-secondary p-1">
            {VIEWS.map((v) => (
              <button
                key={v.id}
                type="button"
                onClick={() => setView(v.id)}
                className={cn(
                  "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                  view === v.id
                    ? "bg-card text-accent shadow-[var(--shadow-raised)]"
                    : "text-muted hover:text-foreground"
                )}
              >
                <v.icon className="size-3.5" />
                {v.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {!hasClasses ? (
        <EmptyState icon={<CalendarDays />}>
          Your timetable is empty — add a class below, or import a calendar file.
        </EmptyState>
      ) : view === "chart" ? (
        <TimetableGrid store={store} onEdit={edit} />
      ) : (
        <WeekGrid store={store} onEdit={edit} />
      )}

      <div id="class-form">
        <ClassForm
          key={editingClass?.id ?? "new"}
          store={store}
          editing={editingClass}
          onDone={() => setEditingClass(null)}
        />
      </div>
      <CalendarImportPanel store={store} />
      <GoogleCalendarPanel store={store} />
      <CalendarSyncPanel store={store} />
    </div>
  );
}
