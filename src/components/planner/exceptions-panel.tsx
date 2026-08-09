"use client";

import { useMemo, useState } from "react";
import { CalendarX2, Plus, TriangleAlert, Undo2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { PlannerStore } from "@/lib/planner/use-planner";
import {
  classLabel,
  EXCEPTION_KINDS,
  type ClassException,
  type ExceptionKind,
} from "@/lib/planner/types";
import {
  DAY_FULL,
  DAY_NAMES,
  formatDateKeyLong,
  minutesOf,
  parseDateKey,
  toDateKey,
  uid,
  weekdayIndex,
} from "@/lib/planner/schedule";
import { Field, inputCls, Panel } from "./ui";

const KIND_LABEL: Record<ExceptionKind, string> = {
  cancelled: "Cancelled",
  moved: "Rescheduled",
  room: "Room change",
};

function describe(ex: ClassException, label: string): string {
  if (ex.kind === "cancelled") return `${label} cancelled`;
  if (ex.kind === "room") return `${label} moves to ${ex.location}`;
  return `${label} moves to ${ex.start}${ex.end ? `–${ex.end}` : ""}${
    ex.location ? ` in ${ex.location}` : ""
  }`;
}

/**
 * Create and undo one-off changes to a single class occurrence.
 *
 * The data model has always supported these, but only the email scan could
 * create one — so "today's lab is cancelled" could not be recorded by hand, and
 * an approved suggestion could not be taken back.
 */
export function ExceptionsPanel({ store }: { store: PlannerStore }) {
  const { classes, exceptions } = store.data;
  const todayKey = toDateKey(new Date());

  const [classId, setClassId] = useState("");
  const [date, setDate] = useState(todayKey);
  const [kind, setKind] = useState<ExceptionKind>("cancelled");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [location, setLocation] = useState("");
  const [error, setError] = useState<string | null>(null);

  const selected = classes.find((c) => c.id === classId) ?? null;

  /* The class only meets on its own weekday, so any other date is a mistake. */
  const wrongDay =
    selected && date
      ? weekdayIndex(parseDateKey(date)) !== selected.day
      : false;

  const rows = useMemo(() => {
    return exceptions
      .map((ex) => ({ ex, cls: classes.find((c) => c.id === ex.classId) ?? null }))
      .filter((r) => r.cls !== null)
      .sort((a, b) => b.ex.date.localeCompare(a.ex.date));
  }, [exceptions, classes]);

  const submit = () => {
    if (!selected) return setError("Pick which class this affects.");
    if (!date) return setError("Pick the date it applies to.");
    if (wrongDay) {
      return setError(
        `${classLabel(selected)} meets on ${DAY_FULL[selected.day]}, and that date isn't one.`
      );
    }
    if (kind === "moved" && !start) {
      return setError("Give the new start time, or record it as a room change.");
    }
    if (kind === "moved" && end && minutesOf(end) <= minutesOf(start)) {
      return setError("The new end time has to be after the new start time.");
    }
    if (kind === "room" && !location.trim()) {
      return setError("Give the new room.");
    }

    // an unspecified end keeps the class's own length
    const length = minutesOf(selected.end) - minutesOf(selected.start);
    const derivedEnd =
      kind === "moved" && !end
        ? `${String(Math.floor((minutesOf(start) + length) / 60) % 24).padStart(2, "0")}:${String(
            (minutesOf(start) + length) % 60
          ).padStart(2, "0")}`
        : end;

    store.addException({
      id: uid(),
      classId: selected.id,
      date,
      kind,
      start: kind === "moved" ? start : undefined,
      end: kind === "moved" ? derivedEnd : undefined,
      location: kind === "cancelled" ? undefined : location.trim() || undefined,
      source: "Added by hand",
    });
    setStart("");
    setEnd("");
    setLocation("");
    setError(null);
  };

  if (classes.length === 0) return null;

  return (
    <Panel title="One-off changes to a single class" icon={<CalendarX2 />}>
      <p className="text-sm text-muted">
        Classes repeat every week, so a lecture cancelled just this Thursday
        can&apos;t be recorded by editing the class itself. Record it here
        instead — the week view, reminders, the Upcoming table and the calendar
        export all follow it. This is also where an approved email suggestion
        can be undone.
      </p>

      <form
        className="mt-4"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Class" className="sm:col-span-2">
            <select
              className={inputCls}
              value={classId}
              onChange={(e) => setClassId(e.target.value)}
            >
              <option value="">Pick a class…</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {DAY_NAMES[c.day]} {c.start} · {classLabel(c)}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Date">
            <input
              type="date"
              className={inputCls}
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </Field>
          <Field label="What changed">
            <select
              className={inputCls}
              value={kind}
              onChange={(e) => setKind(e.target.value as ExceptionKind)}
            >
              {EXCEPTION_KINDS.map((k) => (
                <option key={k} value={k}>
                  {KIND_LABEL[k]}
                </option>
              ))}
            </select>
          </Field>

          {kind === "moved" && (
            <>
              <Field label="New start">
                <input
                  type="time"
                  className={inputCls}
                  value={start}
                  onChange={(e) => setStart(e.target.value)}
                />
              </Field>
              <Field label="New end (optional)">
                <input
                  type="time"
                  className={inputCls}
                  value={end}
                  onChange={(e) => setEnd(e.target.value)}
                />
              </Field>
            </>
          )}
          {kind !== "cancelled" && (
            <Field label={kind === "room" ? "New room" : "New room (optional)"}>
              <input
                className={inputCls}
                value={location}
                placeholder="e.g. LT3"
                onChange={(e) => setLocation(e.target.value)}
              />
            </Field>
          )}
        </div>

        {wrongDay && selected && (
          <p className="mt-3 flex items-center gap-2 text-sm text-warn">
            <TriangleAlert className="size-4" />
            {classLabel(selected)} meets on {DAY_FULL[selected.day]} — that date
            is a {DAY_FULL[weekdayIndex(parseDateKey(date))]}.
          </p>
        )}
        {error && (
          <p className="mt-3 flex items-center gap-2 text-sm text-destructive">
            <TriangleAlert className="size-4" />
            {error}
          </p>
        )}

        <div className="mt-4 flex justify-end">
          <Button type="submit" className="rounded-full px-5">
            <Plus data-icon="inline-start" />
            Record the change
          </Button>
        </div>
      </form>

      {rows.length > 0 && (
        <div className="mt-5 border-t border-border pt-4">
          <h3 className="text-sm font-semibold text-foreground">
            Recorded changes ({rows.length})
          </h3>
          <ul className="mt-3 flex flex-col gap-2">
            {rows.map(({ ex, cls }) => (
              <li
                key={ex.id}
                className={`flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-background/40 px-4 py-3 ${
                  ex.date < todayKey ? "opacity-55" : ""
                }`}
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={ex.kind === "cancelled" ? "destructive" : "secondary"}>
                      {KIND_LABEL[ex.kind]}
                    </Badge>
                    <span className="text-sm text-foreground">
                      {describe(ex, classLabel(cls!))}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-muted">
                    {formatDateKeyLong(ex.date)}
                    {ex.source ? ` · ${ex.source}` : ""}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-muted hover:text-destructive"
                  onClick={() => store.removeException(ex.id)}
                >
                  <Undo2 data-icon="inline-start" />
                  Undo
                </Button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Panel>
  );
}
