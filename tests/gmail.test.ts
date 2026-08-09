import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { interpret, type Message } from "../src/lib/planner/gmail";
import { EMPTY_DATA, type ClassEntry, type PlannerData } from "../src/lib/planner/types";

const cls = (
  id: string,
  code: string,
  title: string,
  day: number,
  start: string,
  end: string
): ClassEntry => ({ id, code, title, type: "lecture", day, start, end, hue: "accent" });

const classes: ClassEntry[] = [
  cls("m", "MATH F111", "Mathematics I", 3, "10:00", "11:00"), // Thu
  cls("c", "CS F111", "Computer Programming", 1, "14:00", "16:00"), // Tue
];

const data: PlannerData = { ...EMPTY_DATA, classes };

const mail = (subject: string, body: string, date = "2026-08-10T09:00:00.000Z"): Message => ({
  id: subject.slice(0, 12),
  subject,
  from: "registrar@example.edu",
  date,
  body,
});

const one = (m: Message, d: PlannerData = data) => {
  const out = interpret([m], d);
  assert.equal(out.length, 1, `expected one proposal, got ${out.length}`);
  return out[0];
};

describe("reading timetable changes out of mail", () => {
  test("a cancellation names the class, the date and the day it falls on", () => {
    const p = one(mail("MATH F111 cancelled", "The MATH F111 lecture on 13 Aug will not be held."));
    assert.equal(p.target, "class");
    if (p.target !== "class") return;
    assert.equal(p.kind, "cancelled");
    assert.equal(p.date, "2026-08-13");
    assert.equal(p.cls.id, "m");
  });

  test("a reschedule carries the new time, with the class's own length", () => {
    const p = one(mail("CS F111 moved", "The CS F111 lab on 11 Aug has been shifted to 3 pm in room D204."));
    assert.equal(p.target, "class");
    if (p.target !== "class") return;
    assert.equal(p.kind, "moved");
    assert.equal(p.start, "15:00");
    assert.equal(p.end, "17:00"); // the lab is two hours long
    assert.equal(p.location, "D204");
  });

  test("a weekday name resolves to the next such date after the mail arrived", () => {
    const p = one(mail("No class Thursday", "The MATH F111 lecture on Thursday is cancelled."));
    assert.equal(p.target === "class" && p.date, "2026-08-13");
  });

  test("a campus holiday becomes a holiday, not a per-class exception", () => {
    const p = one(
      mail(
        "Announcement of Holiday",
        "It is hereby notified that 26 June 2026 (Friday) shall be observed as a holiday on account of Muharram.",
        "2026-06-20T09:00:00.000Z"
      )
    );
    assert.equal(p.target, "holiday");
    if (p.target !== "holiday") return;
    assert.equal(p.date, "2026-06-26");
    assert.equal(p.label, "Muharram");
  });

  test("a holiday already marked is not proposed again", () => {
    const withHoliday: PlannerData = {
      ...data,
      holidays: [{ id: "h", date: "2026-06-26", label: "Muharram" }],
    };
    const out = interpret(
      [mail("Announcement of Holiday", "26 June 2026 shall be observed as a holiday on account of Muharram.", "2026-06-20T09:00:00.000Z")],
      withHoliday
    );
    assert.equal(out.length, 0);
  });

  test("the newest mail wins when two concern the same class and date", () => {
    const out = interpret(
      [
        { ...mail("A", "MATH F111 on 13 Aug is cancelled."), id: "old", date: "2026-08-10T09:00:00.000Z" },
        { ...mail("B", "MATH F111 on 13 Aug is cancelled."), id: "new", date: "2026-08-11T09:00:00.000Z" },
      ],
      data
    );
    assert.equal(out.length, 1);
    assert.equal(out[0].messageId, "new");
  });
});

describe("mail that must not produce a proposal", () => {
  const rejected: [string, Message][] = [
    ["nothing stated clearly", mail("Reminder", "Please note the revised timings on the noticeboard.")],
    ["a class we don't have", mail("PHY F111 cancelled", "The PHY F111 lecture on 12 Aug is cancelled.")],
    ["a date the class doesn't fall on", mail("MATH F111", "The MATH F111 lecture on 12 Aug is cancelled.")],
    ["a reschedule naming no new time or room", mail("CS F111", "The CS F111 lab on 11 Aug has been rescheduled. Details to follow.")],
  ];
  for (const [why, m] of rejected) {
    test(why, () => assert.deepEqual(interpret([m], data), []));
  }
});

describe("regressions", () => {
  /*
   * findRoom once allowed a space between the letters and digits of a room
   * code, so any word followed by a number matched: "the lab on 11 Aug has
   * been rescheduled" yielded a room of "ON 11".
   */
  test("ordinary prose is not read as a room number", () => {
    const p = one(mail("CS F111 timing", "The CS F111 lab on 11 Aug has been shifted to 4 pm."));
    assert.equal(p.target === "class" && p.location, undefined);
  });

  test("real room codes still parse, in each shape", () => {
    const shapes: [string, string][] = [
      ["The venue for MATH F111 on 13 Aug has been changed to Room 2103.", "2103"],
      ["The venue for MATH F111 on 13 Aug has been changed to room LT3.", "LT3"],
      ["MATH F111 on 13 Aug: venue changed to Room No. 6108.", "6108"],
    ];
    for (const [body, expected] of shapes) {
      const p = one(mail("Venue change", body));
      assert.equal(p.target === "class" && p.location, expected, body);
    }
  });

  /*
   * The quoted evidence is the whole basis for approving a proposal. Splitting
   * sentences on every full stop cut "shifts to Room No." off before the
   * number the user is being asked to approve.
   */
  test("the quoted sentence survives an abbreviation", () => {
    const p = one(mail("Venue change", "MATH F111 on 13 Aug shifts to Room No. 6108."));
    assert.match(p.evidence, /Room No\. 6108/);
  });
});
