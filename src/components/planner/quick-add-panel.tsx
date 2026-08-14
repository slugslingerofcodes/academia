"use client";

import { useMemo, useState } from "react";
import { Check, Sparkles, TriangleAlert, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { PlannerStore } from "@/lib/planner/use-planner";
import { CLASS_HUES, classLabel } from "@/lib/planner/types";
import { DAY_NAMES, uid } from "@/lib/planner/schedule";
import { parseQuickAdd, type QuickAdd } from "@/lib/planner/quick-add";
import { inputCls, Panel } from "./ui";

const EXAMPLES = [
  "MATH F111 Mathematics I lecture Mon 9-10 in LT1",
  "CS F111 lab Tue and Thu 2-4pm in D201",
  "holiday on 26 June for Muharram",
  "cancel CS F111 on 18 Aug",
];

function summarise(add: QuickAdd): string {
  if (add.kind === "holiday") {
    return add.label ? `${add.label} — holiday on ${add.date}` : `Holiday on ${add.date}`;
  }
  if (add.kind === "exception") {
    const when = `${DAY_NAMES[add.cls.day]} ${add.date}`;
    if (add.change === "cancelled") return `${classLabel(add.cls)} cancelled on ${when}`;
    if (add.change === "room") return `${classLabel(add.cls)} moves to ${add.location} on ${when}`;
    return `${classLabel(add.cls)} on ${when} moves to ${add.start}–${add.end}`;
  }
  const days = add.days.map((d) => DAY_NAMES[d]).join(", ");
  return `${add.code ? `${add.code} — ` : ""}${add.title} · ${days} ${add.start}–${add.end}${
    add.location ? ` · ${add.location}` : ""
  }`;
}

/**
 * Type one line and have it read into a class, a holiday or a one-off change.
 *
 * Typing beats six form fields, but free text is ambiguous where a form isn't,
 * so the reading is shown field by field before anything is added. When a line
 * can't be read, the panel says which part is missing rather than adding a
 * half-understood entry.
 */
export function QuickAddPanel({ store }: { store: PlannerStore }) {
  const [text, setText] = useState("");
  const [added, setAdded] = useState<string | null>(null);

  // reading as you type: the preview is the whole point, so it can't wait
  const result = useMemo(
    () => parseQuickAdd(text, store.data),
    [text, store.data]
  );

  const commit = () => {
    const add = result.parsed;
    if (!add) return;

    if (add.kind === "holiday") {
      store.addHoliday({ id: uid(), date: add.date, label: add.label });
    } else if (add.kind === "exception") {
      store.addException({
        id: uid(),
        classId: add.cls.id,
        date: add.date,
        kind: add.change,
        start: add.start,
        end: add.end,
        location: add.location,
        source: "Typed in",
      });
    } else {
      // a class naming several days is one entry per day, as the timetable expects
      store.addClasses(
        add.days.map((day) => ({
          id: uid(),
          code: add.code,
          title: add.title,
          type: add.type,
          day,
          start: add.start,
          end: add.end,
          location: add.location,
          hue: CLASS_HUES[0],
        }))
      );
    }

    setAdded(summarise(add));
    setText("");
  };

  return (
    <Panel title="Type it instead" icon={<Wand2 />}>
      <p className="text-sm text-muted">
        Write the thing in one line and Academia works out what you meant — a
        weekly class, a holiday, or a one-off change to a single class. It shows
        you what it understood first; nothing is added until you say so.
      </p>

      <form
        className="mt-4"
        onSubmit={(e) => {
          e.preventDefault();
          commit();
        }}
      >
        <label className="sr-only" htmlFor="quick-add-input">
          Describe what to add
        </label>
        <div className="flex flex-wrap gap-2">
          <input
            id="quick-add-input"
            className={`${inputCls} min-w-0 flex-1`}
            value={text}
            placeholder="e.g. MATH F111 Mathematics I lecture Mon 9-10 in LT1"
            onChange={(e) => {
              setText(e.target.value);
              setAdded(null);
            }}
          />
          <Button
            type="submit"
            className="rounded-full px-5"
            disabled={!result.parsed}
          >
            <Check data-icon="inline-start" />
            Add it
          </Button>
        </div>
      </form>

      {text.trim() === "" && (
        <div className="mt-4">
          <p className="text-xs text-muted">Things you can type:</p>
          <ul className="mt-2 flex flex-wrap gap-2">
            {EXAMPLES.map((e) => (
              <li key={e}>
                <button
                  type="button"
                  onClick={() => setText(e)}
                  className="rounded-full border border-border bg-secondary px-3 py-1.5 text-xs text-muted transition-colors hover:text-foreground"
                >
                  {e}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {result.parsed && (
        <div
          role="status"
          className="mt-4 rounded-xl border border-accent/40 bg-accent-faint p-4"
        >
          <p className="flex items-center gap-2 text-sm font-medium text-accent">
            <Sparkles className="size-4" />
            {summarise(result.parsed)}
          </p>
          <dl className="mt-3 grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
            {result.understood.map((f) => (
              <div key={f.label} className="flex gap-2">
                <dt className="shrink-0 text-muted">{f.label}</dt>
                <dd className="min-w-0 text-foreground">{f.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}

      {!result.parsed && result.problem && (
        <p role="status" className="mt-4 flex items-center gap-2 text-sm text-warn">
          <TriangleAlert className="size-4 shrink-0" />
          {result.problem}
        </p>
      )}

      {added && (
        <p role="status" className="mt-4 flex items-center gap-2 text-sm font-medium text-accent">
          <Check className="size-4" />
          Added: {added}
        </p>
      )}

      <p className="mt-3 text-xs text-muted">
        This changes your timetable here. To put it in Google Calendar too, use
        the sync below.
      </p>
    </Panel>
  );
}
