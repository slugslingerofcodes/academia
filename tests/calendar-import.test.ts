import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  eventsToClasses,
  isOwnEvent,
  type CalendarEvent,
} from "../src/lib/planner/google-calendar-import";
import { ACADEMIA_MARK } from "../src/lib/planner/google-calendar";

const weekly = (over: Partial<CalendarEvent> = {}): CalendarEvent => ({
  id: "evt",
  summary: "MATH F213 — Discrete Structures (Lecture)",
  location: "LT4",
  start: { dateTime: "2026-08-10T09:00:00+05:30" },
  end: { dateTime: "2026-08-10T10:00:00+05:30" },
  recurrence: ["RRULE:FREQ=WEEKLY;BYDAY=MO"],
  ...over,
});

describe("turning calendar events into classes", () => {
  test("a weekly event becomes a class, with code, title, type and room", () => {
    const { classes } = eventsToClasses([weekly()]);
    assert.equal(classes.length, 1);
    assert.deepEqual(classes[0], {
      code: "MATH F213",
      title: "Discrete Structures",
      type: "lecture",
      day: 0,
      start: "09:00",
      end: "10:00",
      location: "LT4",
    });
  });

  test("BYDAY naming several days yields one class per day", () => {
    const { classes } = eventsToClasses([
      weekly({ recurrence: ["RRULE:FREQ=WEEKLY;BYDAY=MO,WE,FR"] }),
    ]);
    assert.deepEqual(classes.map((c) => c.day), [0, 2, 4]);
  });

  test("an event with no end time is given an hour", () => {
    const { classes } = eventsToClasses([weekly({ end: undefined })]);
    assert.equal(classes[0].end, "10:00");
  });

  test("a summary that isn't in code — name form still yields a usable class", () => {
    const { classes } = eventsToClasses([weekly({ summary: "Swimming" })]);
    assert.equal(classes[0].title, "Swimming");
    assert.equal(classes[0].code, undefined);
  });
});

describe("events that are not timetable slots", () => {
  const skipped: [string, CalendarEvent][] = [
    ["a one-off meeting", weekly({ recurrence: undefined })],
    ["an all-day entry", weekly({ start: { date: "2026-08-15" }, end: { date: "2026-08-16" } })],
    ["a monthly series", weekly({ recurrence: ["RRULE:FREQ=MONTHLY;BYDAY=2WE"] })],
    ["a cancelled event", weekly({ status: "cancelled" })],
  ];
  for (const [why, event] of skipped) {
    test(why, () => {
      const res = eventsToClasses([event]);
      assert.deepEqual(res.classes, []);
      assert.equal(res.skipped, 1);
    });
  }
});

describe("not re-importing our own exports", () => {
  /*
   * Sync never deletes remote events, so without this a class deleted in
   * Academia would be resurrected by its leftover copy on the next pull.
   */
  test("an event Academia wrote is recognised by its description", () => {
    assert.ok(isOwnEvent({ description: ACADEMIA_MARK }));
  });

  test("and by its id prefix, even with the description edited away", () => {
    assert.ok(isOwnEvent({ id: "academiaabc123", description: "changed by hand" }));
  });

  test("someone else's event is not mistaken for ours", () => {
    assert.equal(isOwnEvent({ id: "xyz", description: "Weekly lecture" }), false);
  });

  test("our own events are skipped rather than round-tripped", () => {
    const res = eventsToClasses([weekly({ description: ACADEMIA_MARK })]);
    assert.deepEqual(res.classes, []);
    assert.equal(res.skipped, 1);
  });
});
