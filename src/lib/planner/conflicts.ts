import { classLabel, type ClassEntry, type PlannerData } from "./types";
import { DAY_NAMES, minutesOf, toDateKey } from "./schedule";

/** Two half-open intervals clash when each starts before the other ends. */
function overlaps(aStart: number, aEnd: number, bStart: number, bEnd: number): boolean {
  return aStart < bEnd && bStart < aEnd;
}

export interface ClassConflict {
  day: number;
  a: ClassEntry;
  b: ClassEntry;
  /** The overlapping window, as "HH:MM–HH:MM". */
  window: string;
}

function hhmm(total: number): string {
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

/** Every pair of classes whose times clash on the same day. */
export function findClassConflicts(classes: ClassEntry[]): ClassConflict[] {
  const out: ClassConflict[] = [];
  for (let day = 0; day < 7; day++) {
    const onDay = classes
      .filter((c) => c.day === day)
      .sort((a, b) => minutesOf(a.start) - minutesOf(b.start));
    for (let i = 0; i < onDay.length; i++) {
      for (let j = i + 1; j < onDay.length; j++) {
        const a = onDay[i];
        const b = onDay[j];
        const aS = minutesOf(a.start);
        const aE = minutesOf(a.end);
        const bS = minutesOf(b.start);
        const bE = minutesOf(b.end);
        if (!overlaps(aS, aE, bS, bE)) break; // sorted: later ones start even later
        out.push({
          day,
          a,
          b,
          window: `${hhmm(Math.max(aS, bS))}–${hhmm(Math.min(aE, bE))}`,
        });
      }
    }
  }
  return out;
}

/** Would this slot clash with anything already scheduled? */
export function conflictsForSlot(
  classes: ClassEntry[],
  slot: { day: number; start: string; end: string },
  ignoreId?: string
): ClassEntry[] {
  const s = minutesOf(slot.start);
  const e = minutesOf(slot.end);
  return classes.filter(
    (c) =>
      c.id !== ignoreId &&
      c.day === slot.day &&
      overlaps(s, e, minutesOf(c.start), minutesOf(c.end))
  );
}

export interface DayLoad {
  date: string;
  /** Work sessions from different projects landing on the same date. */
  projects: string[];
}

/**
 * Days carrying work sessions from several projects at once. Sessions have no
 * clock time, so this isn't a hard clash — it's a heads-up that a day is
 * carrying more than it looks.
 */
export function findSessionPileups(data: PlannerData): DayLoad[] {
  const byDate = new Map<string, Set<string>>();
  for (const project of data.projects) {
    for (const session of project.sessions) {
      if (session.done) continue;
      if (!byDate.has(session.date)) byDate.set(session.date, new Set());
      byDate.get(session.date)!.add(project.name);
    }
  }
  return [...byDate.entries()]
    .filter(([, names]) => names.size > 1)
    .map(([date, names]) => ({ date, projects: [...names] }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

export function describeConflict(c: ClassConflict): string {
  return `${DAY_NAMES[c.day]} ${c.window}: ${classLabel(c.a)} and ${classLabel(c.b)}`;
}

/* ---- start-of-day digest ---- */

export interface DueToday {
  sessions: { project: string; label: string }[];
  /** Projects whose final date is today. */
  deadlines: string[];
  classes: number;
}

/** What the daily reminder should mention for a given date. */
export function whatIsDue(data: PlannerData, now = new Date()): DueToday {
  const key = toDateKey(now);
  const sessions: { project: string; label: string }[] = [];
  const deadlines: string[] = [];

  for (const project of data.projects) {
    for (const session of project.sessions) {
      if (!session.done && session.date === key) {
        sessions.push({ project: project.name, label: session.label });
      }
    }
    const outstanding = project.sessions.some((s) => !s.done);
    if (project.end === key && outstanding) deadlines.push(project.name);
  }

  const day = (now.getDay() + 6) % 7;
  return {
    sessions,
    deadlines,
    classes: data.classes.filter((c) => c.day === day).length,
  };
}

export function digestBody(due: DueToday): string {
  const parts: string[] = [];
  if (due.deadlines.length > 0) {
    parts.push(
      `Due today: ${due.deadlines.join(", ")}`
    );
  }
  if (due.sessions.length > 0) {
    parts.push(
      `${due.sessions.length} work session${due.sessions.length === 1 ? "" : "s"}: ${due.sessions
        .map((s) => s.project)
        .join(", ")}`
    );
  }
  if (due.classes > 0) {
    parts.push(`${due.classes} class${due.classes === 1 ? "" : "es"}`);
  }
  return parts.join(" · ");
}

export function hasAnythingDue(due: DueToday): boolean {
  return due.deadlines.length > 0 || due.sessions.length > 0;
}
