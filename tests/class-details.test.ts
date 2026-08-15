import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { classDetails, type ClassEntry } from "../src/lib/planner/types";
import { classToEvent, ACADEMIA_MARK } from "../src/lib/planner/google-calendar";
import { isOwnEvent } from "../src/lib/planner/google-calendar-import";

const base: ClassEntry = {
  id: "m",
  code: "MATH F111",
  title: "Mathematics I",
  type: "lecture",
  day: 0,
  start: "09:00",
  end: "10:00",
  location: "LT1",
  hue: "accent",
};

describe("classDetails", () => {
  test("joins instructor and section", () => {
    assert.equal(
      classDetails({ ...base, instructor: "Dr A. Rao", section: "L3" }),
      "Dr A. Rao · L3"
    );
  });

  test("either one alone stands by itself, with no stray separator", () => {
    assert.equal(classDetails({ ...base, instructor: "Dr A. Rao" }), "Dr A. Rao");
    assert.equal(classDetails({ ...base, section: "L3" }), "L3");
  });

  test("neither recorded gives an empty string, so callers can just test it", () => {
    assert.equal(classDetails(base), "");
  });
});

describe("the details reach Google Calendar", () => {
  test("they go in the description, after the marker", () => {
    const event = classToEvent(
      { ...base, instructor: "Dr A. Rao", section: "L3" },
      [],
      10,
      new Date(2026, 7, 10)
    );
    assert.match(event.description, /Dr A\. Rao · L3/);
    assert.ok(event.description.startsWith(ACADEMIA_MARK));
  });

  /*
   * The import side tells our own events apart by this marker. Appending to
   * the description must not stop that working, or a pull would re-import
   * every class we ever pushed.
   */
  test("appending to the description keeps the event recognisable as ours", () => {
    const event = classToEvent(
      { ...base, instructor: "Dr A. Rao", section: "L3" },
      [],
      10,
      new Date(2026, 7, 10)
    );
    assert.ok(isOwnEvent({ id: event.id, description: event.description }));
  });

  test("a class with neither detail carries the bare marker", () => {
    const event = classToEvent(base, [], 10, new Date(2026, 7, 10));
    assert.equal(event.description, ACADEMIA_MARK);
    assert.ok(isOwnEvent({ id: event.id, description: event.description }));
  });
});
