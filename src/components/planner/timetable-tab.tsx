"use client";

import { useEffect, useState } from "react";
import { BellRing, CalendarDays, Clock, Plus, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { PlannerStore } from "@/lib/planner/use-planner";
import { CLASS_HUES, type ClassHue } from "@/lib/planner/types";
import { LEAD_MINUTES, type ClassAlerts } from "@/lib/planner/use-class-notifications";
import {
  DAY_FULL,
  DAY_NAMES,
  classesOnDay,
  currentWeekDates,
  formatDateKey,
  holidaySet,
  nextClass,
  toDateKey,
  uid,
} from "@/lib/planner/schedule";
import { EmptyState, Field, Panel, inputCls } from "./ui";

const HUE_COLOR: Record<ClassHue, string> = {
  accent: "var(--accent)",
  blue: "var(--glitch-b)",
  red: "var(--glitch-r)",
  mono: "#d97706",
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
                ? `Next up: ${upcoming.cls.title} · ${DAY_NAMES[upcoming.cls.day]} ${upcoming.cls.start} (in ${
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
    </Panel>
  );
}

function AddClassForm({ store }: { store: PlannerStore }) {
  const [title, setTitle] = useState("");
  const [day, setDay] = useState(0);
  const [start, setStart] = useState("09:00");
  const [end, setEnd] = useState("10:00");
  const [location, setLocation] = useState("");
  const [error, setError] = useState<string | null>(null);

  const submit = () => {
    if (!title.trim()) return setError("Please enter a class name.");
    if (!start || !end || end <= start)
      return setError("The end time must be after the start time.");
    store.addClass({
      id: uid(),
      title: title.trim(),
      day,
      start,
      end,
      location: location.trim() || undefined,
      hue: CLASS_HUES[store.data.classes.length % CLASS_HUES.length],
    });
    setTitle("");
    setLocation("");
    setError(null);
  };

  return (
    <Panel title="Add a class" icon={<Plus />}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
          <Field label="Class / subject" className="lg:col-span-2">
            <input
              className={inputCls}
              value={title}
              placeholder="e.g. Math F111"
              onChange={(e) => setTitle(e.target.value)}
            />
          </Field>
          <Field label="Day">
            <select className={inputCls} value={day} onChange={(e) => setDay(Number(e.target.value))}>
              {DAY_FULL.map((d, i) => (
                <option key={d} value={i}>
                  {d}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Start time">
            <input className={inputCls} type="time" value={start} onChange={(e) => setStart(e.target.value)} />
          </Field>
          <Field label="End time">
            <input className={inputCls} type="time" value={end} onChange={(e) => setEnd(e.target.value)} />
          </Field>
          <Field label="Room (optional)">
            <input
              className={inputCls}
              value={location}
              placeholder="e.g. LT-2"
              onChange={(e) => setLocation(e.target.value)}
            />
          </Field>
        </div>
        <div className="mt-5 flex items-center justify-end gap-3">
          {error && <span className="text-sm text-destructive">{error}</span>}
          <Button type="submit" className="rounded-full px-5">
            <Plus data-icon="inline-start" />
            Add to timetable
          </Button>
        </div>
      </form>
    </Panel>
  );
}

function WeekGrid({ store }: { store: PlannerStore }) {
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
              "flex min-h-40 flex-col rounded-2xl border bg-card p-3 shadow-[0_1px_3px_rgba(28,33,48,0.06)]",
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
              {isToday && <Badge className="bg-accent text-white">Today</Badge>}
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
                  style={{ borderLeftColor: HUE_COLOR[cls.hue] }}
                >
                  <div className={cn("pr-5 text-sm font-medium text-foreground", isHoliday && "line-through")}>
                    {cls.title}
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted">
                    <Clock className="size-3" />
                    {cls.start}–{cls.end}
                    {cls.location && ` · ${cls.location}`}
                  </div>
                  <button
                    type="button"
                    aria-label={`Remove ${cls.title}`}
                    className="absolute top-1.5 right-1.5 hidden rounded p-0.5 text-muted hover:bg-destructive/10 hover:text-destructive group-hover:block"
                    onClick={() => store.removeClass(cls.id)}
                  >
                    <X className="size-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function TimetableTab({ store, alerts }: { store: PlannerStore; alerts: ClassAlerts }) {
  return (
    <div className="flex flex-col gap-5">
      <AlertsPanel store={store} alerts={alerts} />
      <AddClassForm store={store} />
      <WeekGrid store={store} />
    </div>
  );
}
