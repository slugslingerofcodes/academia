import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  eventsToClasses,
  findOrphanedEvents,
  isOwnEvent,
  type CalendarEvent,
} from "../src/lib/planner/google-calendar-import";
import { ACADEMIA_MARK, toEventId } from "../src/lib/planner/google-calendar";
import type { ClassEntry } from "../src/lib/planner/types";

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

describe("finding events left behind by a deleted class", () => {
  const cls = (id: string): ClassEntry => ({
    id,
    title: `Subject ${id}`,
    type: "lecture",
    day: 0,
    start: "09:00",
    end: "10:00",
    hue: "accent",
  });

  const ours = (classId: string, summary: string): CalendarEvent => ({
    id: toEventId(classId),
    summary,
    description: ACADEMIA_MARK,
    start: { dateTime: "2026-08-10T09:00:00+05:30" },
  });

  const live = cls("11111111-2222-3333-4444-555555555555");
  const gone = cls("99999999-8888-7777-6666-555555555555");

  test("an event whose class still exists is left alone", () => {
    const found = findOrphanedEvents([ours(live.id, "Live class")], [live]);
    assert.deepEqual(found, []);
  });

  test("an event whose class was deleted is reported", () => {
    const found = findOrphanedEvents(
      [ours(live.id, "Live class"), ours(gone.id, "Deleted class")],
      [live]
    );
    assert.equal(found.length, 1);
    assert.equal(found[0].summary, "Deleted class");
  });

  /*
   * The dangerous direction: this decides what gets deleted from a real
   * calendar, so anything not provably ours has to survive.
   */
  test("events Academia did not create are never reported, even with no classes", () => {
    const foreign: CalendarEvent[] = [
      { id: "someone-elses", summary: "Dentist" },
      { id: "team-standup", summary: "Standup", description: "Daily" },
    ];
    assert.deepEqual(findOrphanedEvents(foreign, []), []);
  });

  test("an event with no id is never reported, since it cannot be deleted by id", () => {
    assert.deepEqual(
      findOrphanedEvents([{ summary: "No id", description: ACADEMIA_MARK }], []),
      []
    );
  });

  test("with every class deleted, all of ours are reported and nothing else", () => {
    const events = [ours(live.id, "A"), ours(gone.id, "B"), { id: "x", summary: "Dentist" }];
    const found = findOrphanedEvents(events, []);
    assert.deepEqual(found.map((e) => e.summary), ["A", "B"]);
  });
});
