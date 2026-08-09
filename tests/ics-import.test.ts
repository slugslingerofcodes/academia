import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { interpretSummary, isDuplicate, parseIcs } from "../src/lib/planner/ics-import";

const wrap = (...events: string[]) =>
  ["BEGIN:VCALENDAR", "VERSION:2.0", ...events, "END:VCALENDAR"].join("\r\n");

const event = (...lines: string[]) =>
  ["BEGIN:VEVENT", ...lines, "END:VEVENT"].join("\r\n");

describe("interpretSummary", () => {
  const cases: [string, { code?: string; title: string; type: string }][] = [
    ["MATH F111 — Mathematics I (Lecture)", { code: "MATH F111", title: "Mathematics I", type: "lecture" }],
    ["CS F111 - Computer Programming (Lab)", { code: "CS F111", title: "Computer Programming", type: "lab" }],
    ["MATH F111 Mathematics I", { code: "MATH F111", title: "Mathematics I", type: "lecture" }],
    // no code to find, so the key is absent rather than present-and-undefined
    ["Biology Laboratory", { title: "Biology Laboratory", type: "lab" }],
    ["Maths Tutorial", { title: "Maths Tutorial", type: "tutorial" }],
  ];
  for (const [summary, expected] of cases) {
    test(summary, () => assert.deepEqual(interpretSummary(summary), expected));
  }
});

describe("parseIcs", () => {
  test("reads a weekly class with its room", () => {
    const { classes } = parseIcs(
      wrap(
        event(
          "DTSTART:20260810T090000",
          "DTEND:20260810T100000",
          "SUMMARY:MATH F111 — Mathematics I (Lecture)",
          "LOCATION:LT1",
          "RRULE:FREQ=WEEKLY;BYDAY=MO"
        )
      )
    );
    assert.equal(classes.length, 1);
    assert.deepEqual(classes[0], {
      code: "MATH F111",
      title: "Mathematics I",
      type: "lecture",
      day: 0,
      start: "09:00",
      end: "10:00",
      location: "LT1",
    });
  });

  test("a BYDAY over several days becomes one class each", () => {
    const { classes } = parseIcs(
      wrap(
        event(
          "DTSTART:20260810T090000",
          "DTEND:20260810T100000",
          "SUMMARY:Maths",
          "RRULE:FREQ=WEEKLY;BYDAY=MO,WE,FR"
        )
      )
    );
    assert.deepEqual(classes.map((c) => c.day), [0, 2, 4]);
  });

  test("DURATION stands in for a missing DTEND", () => {
    const { classes } = parseIcs(
      wrap(
        event(
          "DTSTART:20260810T090000",
          "DURATION:PT1H30M",
          "SUMMARY:Maths",
          "RRULE:FREQ=WEEKLY;BYDAY=MO"
        )
      )
    );
    assert.equal(classes[0].end, "10:30");
  });

  test("folded lines are rejoined before parsing", () => {
    const { classes } = parseIcs(
      wrap(
        [
          "BEGIN:VEVENT",
          "DTSTART:20260810T090000",
          "DTEND:20260810T100000",
          "SUMMARY:MATH F111 — Mathematics",
          "  I (Lecture)",
          "RRULE:FREQ=WEEKLY;BYDAY=MO",
          "END:VEVENT",
        ].join("\r\n")
      )
    );
    assert.equal(classes[0].title, "Mathematics I");
  });

  test("escaped commas and semicolons are unescaped", () => {
    const { classes } = parseIcs(
      wrap(
        event(
          "DTSTART:20260810T090000",
          "DTEND:20260810T100000",
          "SUMMARY:Maths\\, Advanced",
          "RRULE:FREQ=WEEKLY;BYDAY=MO"
        )
      )
    );
    assert.equal(classes[0].title, "Maths, Advanced");
  });

  test("all-day and non-weekly entries are skipped, not guessed at", () => {
    const res = parseIcs(
      wrap(
        event("DTSTART;VALUE=DATE:20260815", "SUMMARY:Independence Day"),
        event("DTSTART:20260812T110000", "DTEND:20260812T120000", "SUMMARY:Dept meeting", "RRULE:FREQ=MONTHLY")
      )
    );
    assert.deepEqual(res.classes, []);
    assert.equal(res.skipped, 2);
  });

  test("a file that isn't a calendar is reported rather than parsed", () => {
    const res = parseIcs("just some text");
    assert.deepEqual(res.classes, []);
    assert.equal(res.warnings.length, 1);
  });
});

describe("isDuplicate", () => {
  const existing = [{ title: "Mathematics I", day: 0, start: "09:00" }];
  const candidate = {
    title: "Mathematics I",
    type: "lecture" as const,
    day: 0,
    start: "09:00",
    end: "10:00",
  };

  test("matches on title, day and start", () => {
    assert.ok(isDuplicate(candidate, existing));
  });

  test("a different day is not a duplicate", () => {
    assert.equal(isDuplicate({ ...candidate, day: 1 }, existing), false);
  });

  test("a different start time is not a duplicate", () => {
    assert.equal(isDuplicate({ ...candidate, start: "11:00" }, existing), false);
  });
});
