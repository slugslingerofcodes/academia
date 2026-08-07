"use client";

import { Pencil, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PlannerStore } from "@/lib/planner/use-planner";
import {
  CLASS_TYPE_LABEL,
  classLabel,
  type ClassEntry,
  type ClassType,
} from "@/lib/planner/types";
import {
  DAY_NAMES,
  classesOnDay,
  currentWeekDates,
  formatDateKey,
  holidaySet,
  minutesOf,
  toDateKey,
} from "@/lib/planner/schedule";

const TYPE_COLOR: Record<ClassType, string> = {
  lecture: "var(--accent)",
  lab: "var(--info)",
  tutorial: "var(--warn)",
};

/** Pixels per hour — drives the whole vertical scale. */
const HOUR_HEIGHT = 60;
const DEFAULT_START = 8 * 60;
const DEFAULT_END = 18 * 60;

/**
 * Lay overlapping classes side by side. Walks the day's classes in start order
 * and drops each into the first lane whose previous class has already ended.
 */
function assignLanes(list: ClassEntry[]): { cls: ClassEntry; lane: number; lanes: number }[] {
  const sorted = [...list].sort((a, b) => minutesOf(a.start) - minutesOf(b.start));
  const laneEnds: number[] = [];
  const placed = sorted.map((cls) => {
    const start = minutesOf(cls.start);
    const end = minutesOf(cls.end);
    let lane = laneEnds.findIndex((e) => e <= start);
    if (lane === -1) {
      lane = laneEnds.length;
      laneEnds.push(end);
    } else {
      laneEnds[lane] = end;
    }
    return { cls, lane };
  });
  return placed.map((p) => ({ ...p, lanes: laneEnds.length }));
}

export function TimetableGrid({
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

  // fit the chart to the actual teaching day, rounded out to whole hours
  const starts = classes.map((c) => minutesOf(c.start));
  const ends = classes.map((c) => minutesOf(c.end));
  const dayStart = Math.floor(Math.min(DEFAULT_START, ...starts) / 60) * 60;
  const dayEnd = Math.ceil(Math.max(DEFAULT_END, ...ends) / 60) * 60;
  const totalHeight = ((dayEnd - dayStart) / 60) * HOUR_HEIGHT;
  const hours = Array.from(
    { length: (dayEnd - dayStart) / 60 + 1 },
    (_, i) => dayStart + i * 60
  );

  return (
    <div className="overflow-x-auto rounded-2xl border border-border bg-card p-3 shadow-[0_1px_3px_rgba(0,0,0,0.3)]">
      <div className="min-w-[720px]">
        {/* day headings */}
        <div className="flex">
          <div className="w-14 shrink-0" />
          <div className="grid flex-1 grid-cols-7">
            {week.map((dateKey, day) => {
              const isToday = dateKey === todayKey;
              const isHoliday = skip.has(dateKey);
              return (
                <div
                  key={dateKey}
                  className={cn(
                    "border-b border-l border-border px-1 pb-2 text-center first:border-l-0",
                    isToday && "bg-accent-faint"
                  )}
                >
                  <div
                    className={cn(
                      "text-sm font-semibold",
                      isToday ? "text-accent" : "text-foreground"
                    )}
                  >
                    {DAY_NAMES[day]}
                  </div>
                  <div className="text-xs text-muted">{formatDateKey(dateKey)}</div>
                  {isHoliday && (
                    <div className="mt-0.5 text-[11px] font-medium text-destructive">
                      Holiday
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* time gutter + day columns */}
        <div className="flex">
          <div className="relative w-14 shrink-0" style={{ height: totalHeight }}>
            {hours.map((m) => (
              <div
                key={m}
                className="absolute right-2 -translate-y-1/2 text-xs text-muted"
                style={{ top: ((m - dayStart) / 60) * HOUR_HEIGHT }}
              >
                {String(Math.floor(m / 60)).padStart(2, "0")}:00
              </div>
            ))}
          </div>

          <div className="grid flex-1 grid-cols-7">
            {week.map((dateKey, day) => {
              const isToday = dateKey === todayKey;
              const isHoliday = skip.has(dateKey);
              const placed = assignLanes(classesOnDay(classes, day));
              return (
                <div
                  key={dateKey}
                  className={cn(
                    "relative border-l border-border first:border-l-0",
                    isToday && "bg-accent-faint"
                  )}
                  style={{ height: totalHeight }}
                >
                  {/* hour lines */}
                  {hours.slice(1, -1).map((m) => (
                    <div
                      key={m}
                      className="absolute inset-x-0 border-t border-border/50"
                      style={{ top: ((m - dayStart) / 60) * HOUR_HEIGHT }}
                    />
                  ))}

                  {placed.map(({ cls, lane, lanes }) => {
                    const top = ((minutesOf(cls.start) - dayStart) / 60) * HOUR_HEIGHT;
                    const height = Math.max(
                      22,
                      ((minutesOf(cls.end) - minutesOf(cls.start)) / 60) * HOUR_HEIGHT
                    );
                    const compact = height < 46;
                    return (
                      <div
                        key={cls.id}
                        className={cn(
                          "group absolute overflow-hidden rounded-md border-l-[3px] bg-background px-1.5 py-1 shadow-sm",
                          isHoliday && "opacity-50"
                        )}
                        style={{
                          top,
                          height: height - 2,
                          left: `calc(${(lane / lanes) * 100}% + 2px)`,
                          width: `calc(${100 / lanes}% - 4px)`,
                          borderLeftColor: TYPE_COLOR[cls.type],
                        }}
                        title={`${classLabel(cls)} (${CLASS_TYPE_LABEL[cls.type]}) ${cls.start}–${cls.end}${cls.location ? ` · ${cls.location}` : ""}`}
                      >
                        <div
                          className={cn(
                            "truncate text-[11px] font-semibold leading-tight text-foreground",
                            isHoliday && "line-through"
                          )}
                        >
                          {cls.code ?? cls.title}
                        </div>
                        {!compact && (
                          <>
                            <div className="truncate text-[10px] leading-tight text-muted">
                              {cls.start}–{cls.end}
                            </div>
                            {cls.location && (
                              <div className="truncate text-[10px] leading-tight text-muted">
                                {cls.location}
                              </div>
                            )}
                          </>
                        )}

                        <span className="absolute top-0.5 right-0.5 hidden gap-0.5 group-hover:flex">
                          <button
                            type="button"
                            aria-label={`Edit ${classLabel(cls)}`}
                            className="rounded bg-card/90 p-0.5 text-muted hover:text-accent"
                            onClick={() => onEdit(cls)}
                          >
                            <Pencil className="size-3" />
                          </button>
                          <button
                            type="button"
                            aria-label={`Remove ${classLabel(cls)}`}
                            className="rounded bg-card/90 p-0.5 text-muted hover:text-destructive"
                            onClick={() => store.removeClass(cls.id)}
                          >
                            <X className="size-3" />
                          </button>
                        </span>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
