import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  parseQuickAdd,
  parseTimeRange,
  parseRoom,
  parseDays,
} from "../src/lib/planner/quick-add";
import { EMPTY_DATA, type ClassEntry, type PlannerData } from "../src/lib/planner/types";

const NOW = new Date(2026, 7, 12, 9, 0); // Wed 12 Aug 2026

const cls = (
  id: string,
  code: string,
  title: string,
  day: number,
  start: string,
  end: string
): ClassEntry => ({ id, code, title, type: "lecture", day, start, end, hue: "accent" });

const data: PlannerData = {
  ...EMPTY_DATA,
  classes: [
    cls("m", "MATH F111", "Mathematics I", 3, "10:00", "11:00"), // Thu
    cls("c", "CS F111", "Computer Programming", 1, "14:00", "16:00"), // Tue
  ],
};

const parse = (line: string, d: PlannerData = data) => parseQuickAdd(line, d, NOW);

describe("time ranges", () => {
  const cases: [string, string, string | undefined][] = [
    ["9-10", "09:00", "10:00"],
    ["09:00-10:00", "09:00", "10:00"],
    ["2-4pm", "14:00", "16:00"],
    ["2pm-4pm", "14:00", "16:00"],
    ["10am to 11:30am", "10:00", "11:30"],
    ["11-1", "11:00", "13:00"], // crosses noon
    ["at 3pm", "15:00", undefined],
    ["9:30", "09:30", undefined],
  ];
  for (const [input, start, end] of cases) {
    test(input, () => {
      const got = parseTimeRange(input);
      assert.equal(got?.start, start);
      assert.equal(got?.end, end);
    });
  }

  test("a bare afternoon hour is read as the working day, not the small hours", () => {
    assert.equal(parseTimeRange("1-2")?.start, "13:00");
  });

  test("text with no time at all yields nothing", () => {
    assert.equal(parseTimeRange("Mathematics lecture"), null);
  });
});

describe("rooms", () => {
  test("named after a preposition", () => {
    assert.equal(parseRoom("lecture in D201")?.room, "D201");
    assert.equal(parseRoom("class at 2103")?.room, "2103");
    assert.equal(parseRoom("room no. 6108")?.room, "6108");
  });

  test("a lecture-theatre code is recognised on its own", () => {
    assert.equal(parseRoom("Maths LT3 Monday")?.room, "LT3");
  });

  /* A bare number belongs to the subject far more often than to a room. */
  test("a bare number is not turned into a room", () => {
    assert.equal(parseRoom("Physics 2 lecture"), null);
  });
});

describe("days", () => {
  test("one day", () => assert.deepEqual(parseDays("Mon 9-10").days, [0]));
  test("several days, in week order", () => {
    assert.deepEqual(parseDays("Fri and Monday and Wed").days, [0, 2, 4]);
  });
  test("full names and short forms alike", () => {
    assert.deepEqual(parseDays("tuesday thurs").days, [1, 3]);
  });
});

describe("adding a class", () => {
  test("a full line is read into every field", () => {
    const { parsed } = parse("MATH F111 Mathematics I lecture Mon 9-10 in LT1");
    assert.deepEqual(parsed, {
      kind: "class",
      code: "MATH F111",
      title: "Mathematics I",
      type: "lecture",
      days: [0],
      start: "09:00",
      end: "10:00",
      location: "LT1",
    });
  });

  test("the kind is taken from the word used", () => {
    assert.equal(parse("CS F111 lab Tue 2-4pm in D201").parsed?.kind === "class" &&
      (parse("CS F111 lab Tue 2-4pm in D201").parsed as { type: string }).type, "lab");
    const tut = parse("Physics tutorial Wed 11am");
    assert.equal(tut.parsed?.kind === "class" && (tut.parsed as { type: string }).type, "tutorial");
  });

  test("several days become one class each", () => {
    const { parsed } = parse("BIO F110 lab Mon and Wed 2-4pm");
    assert.deepEqual(parsed?.kind === "class" ? parsed.days : null, [0, 2]);
  });

  /* "Tue and Thu" once left the "and" behind, in the subject's name. */
  test("the conjunction between days doesn't end up in the title", () => {
    const { parsed } = parse("CS F111 Computer Programming lab Tue and Thu 2-4pm in D201");
    assert.equal(parsed?.kind === "class" && parsed.title, "Computer Programming");
    assert.deepEqual(parsed?.kind === "class" ? parsed.days : null, [1, 3]);
  });

  test("commas between days are consumed too", () => {
    const { parsed } = parse("Maths lecture Mon, Wed, Fri 9-10");
    assert.equal(parsed?.kind === "class" && parsed.title, "Maths");
    assert.deepEqual(parsed?.kind === "class" ? parsed.days : null, [0, 2, 4]);
  });

  /* But a subject that genuinely contains "and" must keep it. */
  test("a subject named with 'and' keeps it", () => {
    const { parsed } = parse("Science and Technology lecture Mon 9-10");
    assert.equal(parsed?.kind === "class" && parsed.title, "Science and Technology");
  });

  test("a class with no end time runs an hour", () => {
    const { parsed } = parse("Maths lecture Fri 9am");
    assert.equal(parsed?.kind === "class" && parsed.end, "10:00");
  });

  test("a subject with no code keeps its whole name as the title", () => {
    const { parsed } = parse("Swimming Sat 7am");
    assert.equal(parsed?.kind === "class" && parsed.code, undefined);
    assert.equal(parsed?.kind === "class" && parsed.title, "Swimming");
  });

  describe("lines it should refuse rather than guess at", () => {
    const refused: [string, RegExp][] = [
      ["MATH F111 lecture 9-10", /which day/i],
      ["MATH F111 lecture on Monday", /what time/i],
      ["Monday 9-10", /name/i],
    ];
    for (const [line, why] of refused) {
      test(line, () => {
        const res = parse(line);
        assert.equal(res.parsed, null);
        assert.match(res.problem ?? "", why);
      });
    }
  });
});

describe("adding a holiday", () => {
  test("a date and a reason", () => {
    const { parsed } = parse("holiday on 26 June for Muharram");
    assert.deepEqual(parsed, { kind: "holiday", date: "2026-06-26", label: "Muharram" });
  });

  test("a date alone is enough", () => {
    const { parsed } = parse("holiday 15 Aug");
    assert.equal(parsed?.kind === "holiday" && parsed.date, "2026-08-15");
  });

  test("without a date it asks for one", () => {
    const res = parse("holiday for Diwali");
    assert.equal(res.parsed, null);
    assert.match(res.problem ?? "", /date/i);
  });
});

describe("changing one occurrence of a class", () => {
  test("cancelling names the class and the date", () => {
    const { parsed } = parse("cancel MATH F111 on 13 Aug");
    assert.equal(parsed?.kind, "exception");
    if (parsed?.kind !== "exception") return;
    assert.equal(parsed.change, "cancelled");
    assert.equal(parsed.cls.id, "m");
    assert.equal(parsed.date, "2026-08-13");
  });

  test("moving to a new time keeps the class's own length", () => {
    const { parsed } = parse("move CS F111 to 4pm on 18 Aug");
    assert.equal(parsed?.kind, "exception");
    if (parsed?.kind !== "exception") return;
    assert.equal(parsed.change, "moved");
    assert.equal(parsed.start, "16:00");
    assert.equal(parsed.end, "18:00"); // the lab runs two hours
  });

  test("a room-only change is recorded as one", () => {
    const { parsed } = parse("CS F111 moved to room D310 on 18 Aug");
    assert.equal(parsed?.kind === "exception" && parsed.change, "room");
    assert.equal(parsed?.kind === "exception" && parsed.location, "D310");
  });

  /* The class only meets on its own weekday, so any other date is a slip. */
  test("a date the class doesn't meet on is refused, with the reason", () => {
    const res = parse("cancel MATH F111 on 12 Aug"); // a Wednesday
    assert.equal(res.parsed, null);
    assert.match(res.problem ?? "", /Thursday/);
  });

  test("a change naming no class we have is refused rather than invented", () => {
    const res = parse("cancel PHY F110 on 13 Aug");
    assert.equal(res.parsed, null);
    assert.match(res.problem ?? "", /no class here matches/i);
  });

  test("a cancellation with no date asks which week", () => {
    const res = parse("cancel MATH F111");
    assert.equal(res.parsed, null);
    assert.match(res.problem ?? "", /date/i);
  });
});

describe("telling the three apart", () => {
  test("the word holiday wins over anything class-like", () => {
    assert.equal(parse("holiday on 26 June").parsed?.kind, "holiday");
  });

  test("with an empty timetable, a cancellation reads as a new class instead", () => {
    // nothing to cancel, so the line can only be describing something new
    const res = parse("cancel practice Mon 9-10", EMPTY_DATA);
    assert.equal(res.parsed?.kind, "class");
  });

  test("an empty line produces nothing and complains about nothing", () => {
    const res = parse("   ");
    assert.equal(res.parsed, null);
    assert.equal(res.problem, undefined);
  });
});
