"use client";

import { useState } from "react";
import { Pencil, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { PlannerStore } from "@/lib/planner/use-planner";
import {
  CLASS_HUES,
  CLASS_TYPES,
  CLASS_TYPE_LABEL,
  type ClassEntry,
  type ClassType,
} from "@/lib/planner/types";
import { DAY_NAMES, uid } from "@/lib/planner/schedule";
import { Field, Panel, inputCls } from "./ui";

/** A day the subject meets, with its own times. */
interface DaySlot {
  selected: boolean;
  start: string;
  end: string;
  location: string;
}

const BLANK_SLOT: DaySlot = {
  selected: false,
  start: "09:00",
  end: "10:00",
  location: "",
};

function blankSlots(): DaySlot[] {
  return DAY_NAMES.map(() => ({ ...BLANK_SLOT }));
}

/** Prefill the editing entry's own day, leaving the rest unselected. */
function slotsForEdit(entry: ClassEntry): DaySlot[] {
  return DAY_NAMES.map((_, i) =>
    i === entry.day
      ? {
          selected: true,
          start: entry.start,
          end: entry.end,
          location: entry.location ?? "",
        }
      : { ...BLANK_SLOT }
  );
}

export function ClassForm({
  store,
  editing,
  onDone,
}: {
  store: PlannerStore;
  editing: ClassEntry | null;
  onDone: () => void;
}) {
  const [code, setCode] = useState(editing?.code ?? "");
  const [title, setTitle] = useState(editing?.title ?? "");
  const [type, setType] = useState<ClassType>(editing?.type ?? "lecture");
  const [slots, setSlots] = useState<DaySlot[]>(() =>
    editing ? slotsForEdit(editing) : blankSlots()
  );
  const [error, setError] = useState<string | null>(null);

  const patchSlot = (i: number, patch: Partial<DaySlot>) =>
    setSlots((s) => s.map((x, j) => (j === i ? { ...x, ...patch } : x)));

  const chosen = slots
    .map((s, day) => ({ ...s, day }))
    .filter((s) => s.selected);

  const submit = () => {
    if (!title.trim() && !code.trim())
      return setError("Enter at least a subject code or name.");
    if (chosen.length === 0) return setError("Pick at least one day.");
    for (const s of chosen) {
      if (!s.start || !s.end || s.end <= s.start)
        return setError(
          `${DAY_NAMES[s.day]}: the end time must be after the start time.`
        );
    }

    const shared = {
      code: code.trim() || undefined,
      title: title.trim() || code.trim(),
      type,
    };

    if (editing) {
      // editing targets one meeting; keep it on the single chosen slot
      const s = chosen[0];
      store.updateClass(editing.id, {
        ...shared,
        day: s.day,
        start: s.start,
        end: s.end,
        location: s.location.trim() || undefined,
      });
      // any extra days ticked while editing become additional meetings
      const extra = chosen.slice(1).map((x) => ({
        id: uid(),
        ...shared,
        day: x.day,
        start: x.start,
        end: x.end,
        location: x.location.trim() || undefined,
        hue: CLASS_HUES[0],
      }));
      if (extra.length > 0) store.addClasses(extra);
      onDone();
      return;
    }

    store.addClasses(
      chosen.map((s) => ({
        id: uid(),
        ...shared,
        day: s.day,
        start: s.start,
        end: s.end,
        location: s.location.trim() || undefined,
        hue: CLASS_HUES[0],
      }))
    );
    setCode("");
    setTitle("");
    setSlots(blankSlots());
    setError(null);
  };

  return (
    <Panel
      title={editing ? "Edit class" : "Add a class"}
      icon={editing ? <Pencil /> : <Plus />}
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Subject code">
            <input
              className={inputCls}
              value={code}
              placeholder="e.g. MATH F111"
              onChange={(e) => setCode(e.target.value)}
            />
          </Field>
          <Field label="Subject name" className="sm:col-span-1 lg:col-span-2">
            <input
              className={inputCls}
              value={title}
              placeholder="e.g. Mathematics I"
              onChange={(e) => setTitle(e.target.value)}
            />
          </Field>
          <Field label="Type">
            <select
              className={inputCls}
              value={type}
              onChange={(e) => setType(e.target.value as ClassType)}
            >
              {CLASS_TYPES.map((t) => (
                <option key={t} value={t}>
                  {CLASS_TYPE_LABEL[t]}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <fieldset className="mt-5">
          <legend className="text-xs font-medium text-muted">
            {editing
              ? "Day and time (tick more days to add extra meetings)"
              : "Days and times — tick every day this class meets"}
          </legend>
          <div className="mt-2 flex flex-col gap-2">
            {DAY_NAMES.map((dayName, i) => {
              const slot = slots[i];
              return (
                <div
                  key={dayName}
                  className={cn(
                    "flex flex-wrap items-center gap-3 rounded-xl border px-3 py-2 transition-colors",
                    slot.selected
                      ? "border-accent/50 bg-accent-faint"
                      : "border-border bg-background/40"
                  )}
                >
                  <label className="flex w-24 cursor-pointer items-center gap-2 text-sm font-medium">
                    <input
                      type="checkbox"
                      className="size-4 accent-[var(--accent)]"
                      checked={slot.selected}
                      onChange={(e) => patchSlot(i, { selected: e.target.checked })}
                    />
                    {dayName}
                  </label>

                  {slot.selected ? (
                    <div className="flex flex-wrap items-center gap-2">
                      <input
                        aria-label={`${dayName} start time`}
                        className={cn(inputCls, "w-32")}
                        type="time"
                        value={slot.start}
                        onChange={(e) => patchSlot(i, { start: e.target.value })}
                      />
                      <span className="text-sm text-muted">to</span>
                      <input
                        aria-label={`${dayName} end time`}
                        className={cn(inputCls, "w-32")}
                        type="time"
                        value={slot.end}
                        onChange={(e) => patchSlot(i, { end: e.target.value })}
                      />
                      <input
                        aria-label={`${dayName} room`}
                        className={cn(inputCls, "w-32")}
                        value={slot.location}
                        placeholder="Room"
                        onChange={(e) => patchSlot(i, { location: e.target.value })}
                      />
                    </div>
                  ) : (
                    <span className="text-sm text-muted/70">Not scheduled</span>
                  )}
                </div>
              );
            })}
          </div>
        </fieldset>

        <div className="mt-5 flex flex-wrap items-center justify-end gap-3">
          {error && <span className="text-sm text-destructive">{error}</span>}
          {!editing && chosen.length > 1 && (
            <span className="text-sm text-muted">
              Adds {chosen.length} meetings.
            </span>
          )}
          {editing && (
            <Button variant="ghost" type="button" onClick={onDone}>
              Cancel
            </Button>
          )}
          <Button type="submit" className="rounded-full px-5">
            {editing ? (
              "Save changes"
            ) : (
              <>
                <Plus data-icon="inline-start" />
                Add to timetable
              </>
            )}
          </Button>
        </div>
      </form>
    </Panel>
  );
}
