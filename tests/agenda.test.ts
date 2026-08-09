import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { buildAgenda, isEmptyDay, weekTotals } from "../src/lib/planner/agenda";
import { whatIsDue, digestBody } from "../src/lib/planner/conflicts";
import { EMPTY_DATA, type ClassEntry, type PlannerData } from "../src/lib/planner/types";

const cls = (id: string, day: number, start: string, end: string): ClassEntry => ({
  id,
  code: id.toUpperCase(),
  title: `Subject ${id}`,
  type: "lecture",
  day,
  start,
  end,
  location: "LT1",
  hue: "accent",
});

const data: PlannerData = {
  ...EMPTY_DATA,
  classes: [cls("m", 0, "09:00", "10:00"), cls("c", 1, "14:00", "16:00")],
  holidays: [{ id: "h", date: "2026-08-13", label: "Independence Day" }], // Thu
  exceptions: [
    { id: "x1", classId: "c", date: "2026-08-11", kind: "cancelled" },
    {
      id: "x2",
      classId: "m",
      date: "2026-08-17",
      kind: "moved",
      start: "11:00",
      end: "12:00",
      location: "LT7",
    },
  ],
  projects: [
    {
      id: "p1",
      name: "Physics report",
      kind: "project",
      start: "2026-08-10",
      end: "2026-08-13",
      createdAt: 0,
      sessions: [
        { id: "s1", date: "2026-08-11", label: "1 of 2", done: true, start: "16:00", end: "18:00" },
        { id: "s2", date: "2026-08-13", label: "2 of 2", done: false, start: "08:00", end: "10:00" },
      ],
    },
  ],
};

const NOW = new Date(2026, 7, 12, 9, 0); // Wed 12 Aug 2026
const agenda = buildAgenda(data, 2, NOW);
const day = (date: string) =>
  agenda.flatMap((w) => w.days).find((d) => d.date === date)!;

describe("the week window", () => {
  test("starts at the Monday of the current week, so recent days stay visible", () => {
    assert.equal(agenda[0].start, "2026-08-10");
    assert.equal(agenda[0].end, "2026-08-16");
  });

  test("returns the number of weeks asked for, contiguously", () => {
    assert.equal(agenda.length, 2);
    assert.equal(agenda[1].start, "2026-08-17");
  });

  test("marks today and the days behind it", () => {
    assert.ok(day("2026-08-12").isToday);
    assert.ok(day("2026-08-10").isPast);
    assert.equal(day("2026-08-13").isPast, false);
  });
});

describe("holidays cancel classes and nothing else", () => {
  test("the day's classes are replaced by the holiday itself", () => {
    assert.deepEqual(day("2026-08-13").classes, []);
    assert.equal(day("2026-08-13").holiday?.label, "Independence Day");
  });

  test("work and deadlines still land on it", () => {
    assert.equal(day("2026-08-13").sessions.length, 1);
    assert.equal(day("2026-08-13").deadlines.length, 1);
  });

  test("the digest reports work on a holiday but no classes", () => {
    const due = whatIsDue(data, new Date(2026, 7, 13, 9, 0));
    assert.equal(due.sessions.length, 1);
    assert.equal(due.deadlines.length, 1);
    assert.equal(due.classes, 0);
    assert.ok(due.isHoliday);
    assert.match(digestBody(due), /Holiday — no classes/);
  });
});

describe("one-off exceptions", () => {
  test("a cancelled class stays listed, flagged, so the change is visible", () => {
    const [only] = day("2026-08-11").classes;
    assert.equal(only.cls.id, "c");
    assert.ok(only.cancelled);
  });

  test("a moved class shows its replacement time and room", () => {
    const [only] = day("2026-08-17").classes;
    assert.equal(only.start, "11:00");
    assert.equal(only.end, "12:00");
    assert.equal(only.location, "LT7");
    assert.ok(only.moved);
    assert.equal(only.cancelled, false);
  });

  test("the same class is untouched on other weeks", () => {
    const [only] = day("2026-08-10").classes;
    assert.equal(only.start, "09:00");
    assert.equal(only.moved, false);
  });
});

describe("totals and emptiness", () => {
  test("only live classes and unfinished work are counted", () => {
    // Mon has one class, Tue's is cancelled, Thu is a holiday
    assert.deepEqual(weekTotals(agenda[0]), {
      classes: 1,
      sessions: 1,
      holidays: 1,
      deadlines: 1,
    });
  });

  test("a day is empty only when it holds nothing at all", () => {
    assert.ok(isEmptyDay(day("2026-08-15")));
    assert.equal(isEmptyDay(day("2026-08-13")), false);
  });

  test("recurring classes alone keep a week from being empty", () => {
    assert.equal(agenda[1].empty, false);
  });

  test("with no data at all, every week is empty", () => {
    assert.ok(buildAgenda(EMPTY_DATA, 3, NOW).every((w) => w.empty));
  });
});
