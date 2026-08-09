import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  classLoadOn,
  freeWindowOn,
  generateSessions,
  weekdayIndex,
  parseDateKey,
} from "../src/lib/planner/schedule";
import type { ClassEntry, Holiday } from "../src/lib/planner/types";

const cls = (
  id: string,
  day: number,
  start: string,
  end: string
): ClassEntry => ({
  id,
  code: id.toUpperCase(),
  title: `Subject ${id}`,
  type: "lecture",
  day,
  start,
  end,
  hue: "accent",
});

/* every weekday teaches something, so zero load can only mean a holiday */
const classes: ClassEntry[] = [
  cls("a", 0, "09:00", "10:00"), // Mon, 60m
  cls("b", 1, "11:00", "12:00"), // Tue, 60m
  cls("c", 2, "10:00", "11:00"), // Wed, 60m
  cls("d", 3, "09:00", "11:00"), // Thu, heaviest at 300m
  cls("e", 3, "14:00", "17:00"),
];

const holidayOn = (date: string): Holiday[] => [{ id: "h", date, label: "Break" }];

describe("class load and free windows", () => {
  test("load is the total taught minutes on a weekday", () => {
    assert.equal(classLoadOn(classes, 3), 300);
    assert.equal(classLoadOn(classes, 0), 60);
    assert.equal(classLoadOn(classes, 5), 0);
  });

  test("the free window is the largest gap inside the study day", () => {
    // Thu teaches 09:00-11:00 and 14:00-17:00. The study day runs to 22:00, so
    // the evening (5h) beats the midday gap (3h), capped to a 2h session.
    assert.deepEqual(freeWindowOn(classes, 3), { start: "17:00", end: "19:00" });
  });

  test("a day with no classes opens at the start of the study day", () => {
    assert.deepEqual(freeWindowOn(classes, 5), { start: "08:00", end: "10:00" });
  });
});

describe("generateSessions", () => {
  test("spreads the requested number of sessions across the period", () => {
    const out = generateSessions({
      start: "2026-08-10",
      end: "2026-08-21",
      count: 4,
      holidays: [],
      skipWeekends: true,
      classes,
    });
    assert.equal(out.length, 4);
    const dates = out.map((s) => s.date);
    assert.deepEqual([...dates].sort(), dates, "sessions come out in date order");
    assert.equal(new Set(dates).size, 4, "no two sessions share a date");
  });

  test("avoids the heaviest teaching day when a lighter one is available", () => {
    const [session] = generateSessions({
      start: "2026-08-10", // Mon
      end: "2026-08-13", // Thu, the heavy day
      count: 1,
      holidays: [],
      skipWeekends: true,
      classes,
    });
    assert.notEqual(session.date, "2026-08-13");
  });

  test("skipWeekends leaves an all-weekend period with nothing to schedule", () => {
    const out = generateSessions({
      start: "2026-08-15", // Sat
      end: "2026-08-16", // Sun
      count: 2,
      holidays: [],
      skipWeekends: true,
      classes,
    });
    assert.equal(out.length, 0);
  });

  test("weekends are used when not skipped", () => {
    const out = generateSessions({
      start: "2026-08-15",
      end: "2026-08-16",
      count: 2,
      holidays: [],
      skipWeekends: false,
      classes,
    });
    assert.equal(out.length, 2);
  });

  /*
   * Holidays cancel classes, not your own work: a deadline doesn't move because
   * campus is shut. These guard the behaviour, not just the implementation.
   */
  describe("holidays stay available for work", () => {
    test("a period made entirely of holidays still schedules", () => {
      const holidays = ["2026-08-10", "2026-08-11", "2026-08-12", "2026-08-13", "2026-08-14"]
        .map((date, i) => ({ id: `h${i}`, date, label: "Break" }));
      const out = generateSessions({
        start: "2026-08-10",
        end: "2026-08-14",
        count: 3,
        holidays,
        skipWeekends: true,
        classes,
      });
      assert.equal(out.length, 3);
    });

    test("a holiday is preferred over every teaching day", () => {
      const [session] = generateSessions({
        start: "2026-08-10", // Mon
        end: "2026-08-13", // Thu — a holiday here, so zero load
        count: 1,
        holidays: holidayOn("2026-08-13"),
        skipWeekends: true,
        classes,
      });
      assert.equal(session.date, "2026-08-13");
      assert.equal(weekdayIndex(parseDateKey(session.date)), 3);
    });

    test("a session on a holiday gets the whole study day, not a gap between classes", () => {
      const [session] = generateSessions({
        start: "2026-08-13",
        end: "2026-08-13",
        count: 1,
        holidays: holidayOn("2026-08-13"),
        skipWeekends: true,
        classes,
      });
      // Thursday normally yields 11:00-13:00; with no teaching it starts at 08:00
      assert.equal(session.start, "08:00");
      assert.equal(session.end, "10:00");
    });
  });
});
