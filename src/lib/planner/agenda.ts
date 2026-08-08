import type { ClassEntry, EntryKind, Holiday, PlannerData } from "./types";
import {
  addDays,
  classesOnDay,
  currentWeekDates,
  occurrenceOn,
  parseDateKey,
  startOfDay,
  toDateKey,
  weekdayIndex,
} from "./schedule";

/**
 * One combined view of everything landing on a date: classes, holidays and
 * your own work.
 *
 * The three live in separate places and follow different rules — classes repeat
 * weekly and can be cancelled or moved for one occurrence, holidays cancel
 * classes but not work, work sessions are fixed to a date — so the merge has to
 * happen somewhere. Doing it here keeps that reasoning out of the table markup.
 */

export interface AgendaClass {
  cls: ClassEntry;
  /** Effective times for this date; differ from the class when it was moved. */
  start: string;
  end: string;
  location?: string;
  moved: boolean;
  cancelled: boolean;
}

export interface AgendaSession {
  projectId: string;
  project: string;
  kind: EntryKind;
  label: string;
  done: boolean;
  start?: string;
  end?: string;
}

export interface AgendaDay {
  date: string;
  /** 0 = Monday … 6 = Sunday. */
  weekday: number;
  isToday: boolean;
  isPast: boolean;
  holiday: Holiday | null;
  classes: AgendaClass[];
  sessions: AgendaSession[];
  /** Projects whose final date is this day. */
  deadlines: { id: string; name: string; kind: EntryKind }[];
}

export interface AgendaWeek {
  /** Monday of the week. */
  start: string;
  /** Sunday of the week. */
  end: string;
  days: AgendaDay[];
  /** True when the week holds nothing at all — used to offer to collapse it. */
  empty: boolean;
}

export function isEmptyDay(day: AgendaDay): boolean {
  return (
    day.classes.length === 0 &&
    day.sessions.length === 0 &&
    day.deadlines.length === 0 &&
    day.holiday === null
  );
}

function dayFor(data: PlannerData, date: string, todayKey: string): AgendaDay {
  const weekday = weekdayIndex(parseDateKey(date));
  const holiday = data.holidays.find((h) => h.date === date) ?? null;

  /*
   * A holiday cancels every class that day, so listing them all struck through
   * would be noise. A single class cancelled by an exception is the opposite —
   * that's specific information, so it stays visible with a marker.
   */
  const classes: AgendaClass[] = holiday
    ? []
    : classesOnDay(data.classes, weekday).map((cls) => {
        const occurrence = occurrenceOn(cls, date, data.exceptions);
        return occurrence
          ? { cls, ...occurrence, moved: occurrence.changed, cancelled: false }
          : {
              cls,
              start: cls.start,
              end: cls.end,
              location: cls.location,
              moved: false,
              cancelled: true,
            };
      });

  const sessions: AgendaSession[] = [];
  const deadlines: { id: string; name: string; kind: EntryKind }[] = [];

  for (const project of data.projects) {
    for (const session of project.sessions) {
      if (session.date !== date) continue;
      sessions.push({
        projectId: project.id,
        project: project.name,
        kind: project.kind,
        label: session.label,
        done: session.done,
        start: session.start,
        end: session.end,
      });
    }
    if (project.end === date) {
      deadlines.push({ id: project.id, name: project.name, kind: project.kind });
    }
  }

  // timed sessions first, in clock order; untimed ones after
  sessions.sort((a, b) => (a.start ?? "99:99").localeCompare(b.start ?? "99:99"));

  return {
    date,
    weekday,
    isToday: date === todayKey,
    isPast: date < todayKey,
    holiday,
    classes,
    sessions,
    deadlines,
  };
}

/**
 * `weeks` weeks of combined schedule, starting from the Monday of the current
 * week so the days already behind you stay visible for context.
 */
export function buildAgenda(
  data: PlannerData,
  weeks: number,
  now = new Date()
): AgendaWeek[] {
  const todayKey = toDateKey(now);
  const monday = parseDateKey(currentWeekDates(now)[0]);

  return Array.from({ length: Math.max(1, weeks) }, (_, w) => {
    const first = addDays(startOfDay(monday), w * 7);
    const days = Array.from({ length: 7 }, (_, i) =>
      dayFor(data, toDateKey(addDays(first, i)), todayKey)
    );
    return {
      start: days[0].date,
      end: days[6].date,
      days,
      empty: days.every(isEmptyDay),
    };
  });
}

export interface WeekTotals {
  classes: number;
  sessions: number;
  holidays: number;
  deadlines: number;
}

export function weekTotals(week: AgendaWeek): WeekTotals {
  return week.days.reduce<WeekTotals>(
    (sum, day) => ({
      classes: sum.classes + day.classes.filter((c) => !c.cancelled).length,
      sessions: sum.sessions + day.sessions.filter((s) => !s.done).length,
      holidays: sum.holidays + (day.holiday ? 1 : 0),
      deadlines: sum.deadlines + day.deadlines.length,
    }),
    { classes: 0, sessions: 0, holidays: 0, deadlines: 0 }
  );
}
