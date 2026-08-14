"use client";

import { useMemo, useState } from "react";
import { Check, CloudUpload, Sparkles, TriangleAlert, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { PlannerStore } from "@/lib/planner/use-planner";
import {
  CLASS_HUES,
  classLabel,
  type ClassEntry,
  type ClassException,
  type Holiday,
  type PlannerData,
} from "@/lib/planner/types";
import { DAY_NAMES, uid } from "@/lib/planner/schedule";
import { LEAD_MINUTES } from "@/lib/planner/use-class-notifications";
import {
  isConfigured,
  requestAccessToken,
  syncClasses,
} from "@/lib/planner/google-calendar";
import {
  classesTouchedBy,
  parseQuickAdd,
  type QuickAdd,
} from "@/lib/planner/quick-add";
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
type PushState =
  | { stage: "idle" }
  | { stage: "pushing" }
  | { stage: "done"; count: number }
  | { stage: "nothing" }
  | { stage: "error"; message: string };

export function QuickAddPanel({ store }: { store: PlannerStore }) {
  const [text, setText] = useState("");
  const [added, setAdded] = useState<string | null>(null);
  const [push, setPush] = useState<PushState>({ stage: "idle" });

  const configured = isConfigured();
  const pushOn = configured && store.data.settings.pushOnQuickAdd;

  // reading as you type: the preview is the whole point, so it can't wait
  const result = useMemo(
    () => parseQuickAdd(text, store.data),
    [text, store.data]
  );

  /**
   * Send the affected classes on to Google Calendar.
   *
   * `next` is built by the caller rather than read from the store: the store
   * updates on a later render, so reading it here would push a holiday's
   * classes without the holiday, and the event would keep the date it should
   * have dropped.
   */
  const pushToGoogle = async (add: QuickAdd, created: ClassEntry[], next: PlannerData) => {
    const affected = classesTouchedBy(add, created, next.classes);
    if (affected.length === 0) {
      setPush({ stage: "nothing" });
      return;
    }
    setPush({ stage: "pushing" });
    try {
      const token = await requestAccessToken();
      const res = await syncClasses(next, token, LEAD_MINUTES, affected);
      if (res.failed.length > 0 && res.created + res.updated === 0) {
        setPush({ stage: "error", message: res.failed[0].reason });
      } else {
        setPush({ stage: "done", count: res.created + res.updated });
      }
    } catch (err) {
      setPush({
        stage: "error",
        message: err instanceof Error ? err.message : "Couldn't reach Google Calendar.",
      });
    }
  };

  const commit = () => {
    const add = result.parsed;
    if (!add) return;
    setPush({ stage: "idle" });

    let created: ClassEntry[] = [];
    let next: PlannerData = store.data;

    if (add.kind === "holiday") {
      const holiday: Holiday = { id: uid(), date: add.date, label: add.label };
      store.addHoliday(holiday);
      next = { ...store.data, holidays: [...store.data.holidays, holiday] };
    } else if (add.kind === "exception") {
      const exception: ClassException = {
        id: uid(),
        classId: add.cls.id,
        date: add.date,
        kind: add.change,
        start: add.start,
        end: add.end,
        location: add.location,
        source: "Typed in",
      };
      store.addException(exception);
      next = {
        ...store.data,
        // one per class per date, matching how the store stores them
        exceptions: [
          ...store.data.exceptions.filter(
            (x) => !(x.classId === exception.classId && x.date === exception.date)
          ),
          exception,
        ],
      };
    } else {
      // a class naming several days is one entry per day, as the timetable expects
      created = add.days.map((day) => ({
        id: uid(),
        code: add.code,
        title: add.title,
        type: add.type,
        day,
        start: add.start,
        end: add.end,
        location: add.location,
        hue: CLASS_HUES[0],
      }));
      store.addClasses(created);
      next = { ...store.data, classes: [...store.data.classes, ...created] };
    }

    setAdded(summarise(add));
    setText("");
    if (pushOn) void pushToGoogle(add, created, next);
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

      {push.stage !== "idle" && (
        <p
          role="status"
          className={`mt-2 flex items-center gap-2 text-sm ${
            push.stage === "error" ? "text-destructive" : "text-muted"
          }`}
        >
          {push.stage === "error" ? (
            <TriangleAlert className="size-4 shrink-0" />
          ) : (
            <CloudUpload className="size-4 shrink-0" />
          )}
          {push.stage === "pushing" && "Writing it to Google Calendar…"}
          {push.stage === "done" &&
            `Written to Google Calendar — ${push.count} event${push.count === 1 ? "" : "s"} updated.`}
          {push.stage === "nothing" &&
            "Nothing to write to Google Calendar — no class meets that day."}
          {push.stage === "error" && `Google Calendar: ${push.message}`}
        </p>
      )}

      {configured ? (
        <label className="mt-4 flex cursor-pointer items-start gap-2 border-t border-border pt-4 text-sm text-foreground">
          <input
            type="checkbox"
            className="mt-0.5 size-4 accent-[var(--accent)]"
            checked={store.data.settings.pushOnQuickAdd}
            onChange={(e) => store.updateSettings({ pushOnQuickAdd: e.target.checked })}
          />
          <span>
            Write to Google Calendar as well
            <span className="mt-0.5 block text-xs text-muted">
              Pushes the classes this affects as soon as you add it, and
              remembers the choice. A holiday or a one-off change has no event
              of its own — it rewrites the classes it applies to, so the date
              drops out of the series. A rescheduled class is removed from that
              week rather than moved, the same as the sync below.
            </span>
          </span>
        </label>
      ) : (
        <p className="mt-3 text-xs text-muted">
          This changes your timetable here. To put it in Google Calendar too,
          use the sync below.
        </p>
      )}
    </Panel>
  );
}
