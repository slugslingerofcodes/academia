"use client";

import { useState } from "react";
import { PartyPopper, Pencil, TreePalm, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { PlannerStore } from "@/lib/planner/use-planner";
import type { Holiday } from "@/lib/planner/types";
import { formatDateKeyLong, toDateKey, uid } from "@/lib/planner/schedule";
import { EmptyState, Field, Panel, inputCls } from "./ui";

function HolidayRow({
  holiday,
  store,
  todayKey,
}: {
  holiday: Holiday;
  store: PlannerStore;
  todayKey: string;
}) {
  const [editing, setEditing] = useState(false);
  const [date, setDate] = useState(holiday.date);
  const [label, setLabel] = useState(holiday.label ?? "");
  const past = holiday.date < todayKey;

  const save = () => {
    if (!date) return;
    // an edit that lands on another marked date replaces that entry
    const dup = store.data.holidays.find((x) => x.id !== holiday.id && x.date === date);
    if (dup) store.removeHoliday(dup.id);
    store.updateHoliday(holiday.id, { date, label: label.trim() || undefined });
    setEditing(false);
  };

  const cancel = () => {
    setDate(holiday.date);
    setLabel(holiday.label ?? "");
    setEditing(false);
  };

  if (editing) {
    return (
      <li className="py-3">
        <div className="grid gap-3 sm:grid-cols-[auto_1fr_auto] sm:items-end">
          <Field label="Date">
            <input
              className={inputCls}
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </Field>
          <Field label="Label (optional)">
            <input
              className={inputCls}
              value={label}
              placeholder="e.g. Diwali break"
              onChange={(e) => setLabel(e.target.value)}
            />
          </Field>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={cancel}>
              Cancel
            </Button>
            <Button size="sm" className="rounded-full px-4" onClick={save}>
              Save
            </Button>
          </div>
        </div>
      </li>
    );
  }

  return (
    <li className="flex items-center justify-between gap-3 py-3">
      <div className={cn("flex flex-wrap items-center gap-2.5", past && "opacity-50")}>
        <span className="text-sm font-medium text-foreground">
          {formatDateKeyLong(holiday.date)}
        </span>
        {holiday.date === todayKey && (
          <Badge className="bg-accent text-primary-foreground">Today</Badge>
        )}
        {holiday.label && <span className="text-sm text-muted">{holiday.label}</span>}
      </div>
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          className="text-muted hover:text-accent"
          onClick={() => setEditing(true)}
        >
          <Pencil data-icon="inline-start" />
          Edit
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="text-muted hover:text-destructive"
          onClick={() => store.removeHoliday(holiday.id)}
        >
          <Trash2 data-icon="inline-start" />
          Remove
        </Button>
      </div>
    </li>
  );
}

export function HolidaysTab({ store }: { store: PlannerStore }) {
  const todayKey = toDateKey(new Date());
  const [date, setDate] = useState(todayKey);
  const [label, setLabel] = useState("");
  const [error, setError] = useState<string | null>(null);

  const submit = () => {
    if (!date) return setError("Please pick a date.");
    store.addHoliday({ id: uid(), date, label: label.trim() || undefined });
    setLabel("");
    setError(null);
  };

  const { holidays } = store.data;
  const todayIsHoliday = holidays.some((h) => h.date === todayKey);

  return (
    <div className="flex flex-col gap-5">
      {todayIsHoliday && (
        <div className="flex items-center gap-3 rounded-2xl border border-accent/40 bg-accent-faint px-5 py-4">
          <PartyPopper className="size-5 text-accent" />
          <span className="text-sm font-medium text-accent">
            Today is a holiday — enjoy your day off! Class reminders are paused.
          </span>
        </div>
      )}

      <Panel title="Mark a holiday" icon={<TreePalm />}>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Date">
              <input
                className={inputCls}
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </Field>
            <Field label="Label (optional)" className="sm:col-span-2">
              <input
                className={inputCls}
                value={label}
                placeholder="e.g. Diwali break"
                onChange={(e) => setLabel(e.target.value)}
              />
            </Field>
          </div>
          <div className="mt-5 flex items-center justify-end gap-3">
            {error && <span className="text-sm text-destructive">{error}</span>}
            <Button type="submit" className="rounded-full px-5">
              <PartyPopper data-icon="inline-start" />
              Mark holiday
            </Button>
          </div>
          <p className="mt-3 text-xs text-muted">
            On a holiday, class reminders are paused, the week view flags the day, and new
            task timetables skip it.
          </p>
        </form>
      </Panel>

      {holidays.length === 0 ? (
        <EmptyState icon={<TreePalm />}>No holidays marked yet.</EmptyState>
      ) : (
        <Panel title={`Your holidays (${holidays.length})`} icon={<PartyPopper />}>
          <ul className="flex flex-col divide-y divide-border">
            {holidays.map((h) => (
              <HolidayRow key={h.id} holiday={h} store={store} todayKey={todayKey} />
            ))}
          </ul>
        </Panel>
      )}
    </div>
  );
}
