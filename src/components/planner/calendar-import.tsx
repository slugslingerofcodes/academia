"use client";

import { useCallback, useRef, useState } from "react";
import { Check, FileUp, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { PlannerStore } from "@/lib/planner/use-planner";
import { CLASS_HUES, CLASS_TYPE_LABEL } from "@/lib/planner/types";
import { DAY_NAMES, uid } from "@/lib/planner/schedule";
import { isDuplicate, parseIcs, type ParsedClass } from "@/lib/planner/ics-import";
import { Panel } from "./ui";

interface Preview {
  fresh: ParsedClass[];
  duplicates: number;
  skipped: number;
  warnings: string[];
  fileName: string;
}

export function CalendarImportPanel({ store }: { store: PlannerStore }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [added, setAdded] = useState<number | null>(null);
  const [dragging, setDragging] = useState(false);

  const read = useCallback(
    async (file: File) => {
      setAdded(null);
      const text = await file.text();
      const parsed = parseIcs(text);
      const existing = store.data.classes;
      const fresh: ParsedClass[] = [];
      let duplicates = 0;
      for (const c of parsed.classes) {
        if (isDuplicate(c, existing) || isDuplicate(c, fresh)) duplicates++;
        else fresh.push(c);
      }
      setPreview({
        fresh,
        duplicates,
        skipped: parsed.skipped,
        warnings: parsed.warnings,
        fileName: file.name,
      });
    },
    [store.data.classes]
  );

  const confirm = () => {
    if (!preview) return;
    store.addClasses(
      preview.fresh.map((c) => ({
        id: uid(),
        code: c.code,
        title: c.title,
        type: c.type,
        day: c.day,
        start: c.start,
        end: c.end,
        location: c.location,
        hue: CLASS_HUES[0],
      }))
    );
    setAdded(preview.fresh.length);
    setPreview(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <Panel title="Import a calendar file" icon={<FileUp />}>
      <p className="text-sm text-muted">
        Already have your timetable as a calendar file? Drop an{" "}
        <code className="text-accent">.ics</code> file here — from your
        university portal, Google Calendar, or exported from Academia — and its
        weekly classes are added to your timetable.
      </p>

      <label
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          const file = e.dataTransfer.files?.[0];
          if (file) void read(file);
        }}
        className={cn(
          "mt-4 flex cursor-pointer flex-col items-center gap-1.5 rounded-2xl border-2 border-dashed px-6 py-8 text-center transition-colors",
          dragging
            ? "border-accent bg-accent-faint"
            : "border-border bg-background/40 hover:border-accent/50"
        )}
      >
        <FileUp className="size-6 text-muted" />
        <span className="text-sm font-medium text-foreground">
          Choose a .ics file or drag one here
        </span>
        <span className="text-xs text-muted">Nothing is uploaded — it&apos;s read in your browser.</span>
        <input
          ref={inputRef}
          type="file"
          accept=".ics,text/calendar"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void read(file);
          }}
        />
      </label>

      {preview && (
        <div className="mt-4 rounded-xl border border-border bg-background/40 p-4">
          <p className="text-sm font-medium text-foreground">
            {preview.fileName} — {preview.fresh.length} class
            {preview.fresh.length === 1 ? "" : "es"} to add
          </p>

          {preview.fresh.length > 0 && (
            <ul className="mt-2 max-h-56 space-y-1 overflow-y-auto text-sm text-muted">
              {preview.fresh.map((c, i) => (
                <li key={i}>
                  <span className="text-foreground">
                    {c.code ? `${c.code} — ${c.title}` : c.title}
                  </span>{" "}
                  · {CLASS_TYPE_LABEL[c.type]} · {DAY_NAMES[c.day]} {c.start}–{c.end}
                  {c.location ? ` · ${c.location}` : ""}
                </li>
              ))}
            </ul>
          )}

          {(preview.duplicates > 0 || preview.skipped > 0) && (
            <p className="mt-2 text-xs text-muted">
              {preview.duplicates > 0 &&
                `${preview.duplicates} already in your timetable (skipped). `}
              {preview.skipped > 0 &&
                `${preview.skipped} entr${preview.skipped === 1 ? "y" : "ies"} weren't weekly classes (skipped).`}
            </p>
          )}

          {preview.warnings.map((w) => (
            <p key={w} className="mt-2 flex items-center gap-2 text-sm text-destructive">
              <TriangleAlert className="size-4" />
              {w}
            </p>
          ))}

          <div className="mt-4 flex items-center justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setPreview(null)}>
              Cancel
            </Button>
            <Button
              size="sm"
              className="rounded-full px-4"
              disabled={preview.fresh.length === 0}
              onClick={confirm}
            >
              Add {preview.fresh.length > 0 ? preview.fresh.length : ""} to timetable
            </Button>
          </div>
        </div>
      )}

      {added !== null && (
        <p className="mt-4 flex items-center gap-2 text-sm font-medium text-accent">
          <Check className="size-4" />
          Added {added} class{added === 1 ? "" : "es"} to your timetable.
        </p>
      )}
    </Panel>
  );
}
