import { describe, expect, it } from "vitest";
import { addDaysLocal, checkRepeat, findClashes, repeatStarts, sessionState } from "./calendar";

describe("sessionState", () => {
  const now = new Date("2026-10-28T10:00:00+02:00");

  it("is booked until the session is over, then waits to be captured", () => {
    const session = { outcome: null, startsAt: "2026-10-28T09:00:00+02:00", durationMinutes: 45 };
    expect(sessionState(session, now)).toBe("to_capture");
    expect(sessionState({ ...session, durationMinutes: 90 }, now)).toBe("booked");
  });

  it("follows the outcome once captured", () => {
    expect(sessionState({ outcome: "no_show", startsAt: "2026-10-28T09:00:00+02:00", durationMinutes: 45 }, now)).toBe("no_show");
  });
});

describe("repeatStarts", () => {
  it("books one session without a repeat", () => {
    expect(repeatStarts("2026-10-28T08:00", null)).toEqual(["2026-10-28T08:00"]);
  });

  it("repeats weekly for a number of sessions, the first included", () => {
    expect(repeatStarts("2026-10-28T08:00", { everyWeeks: 1, ends: { after: 3 } })).toEqual([
      "2026-10-28T08:00",
      "2026-11-04T08:00",
      "2026-11-11T08:00",
    ]);
  });

  it("repeats every two weeks until a date, inclusive", () => {
    expect(repeatStarts("2026-10-28T08:00", { everyWeeks: 2, ends: { on: "2026-11-25" } })).toEqual([
      "2026-10-28T08:00",
      "2026-11-11T08:00",
      "2026-11-25T08:00",
    ]);
  });

  it("stops within a year", () => {
    expect(repeatStarts("2026-10-28T08:00", { everyWeeks: 1, ends: { on: "2030-01-01" } })).toHaveLength(53);
    expect(repeatStarts("2026-10-28T08:00", { everyWeeks: 1, ends: { on: "2030-01-01" } }).at(-1)).toBe("2027-10-27T08:00");
  });

  it("keeps the time across months and years", () => {
    expect(addDaysLocal("2026-12-30T23:30", 7)).toBe("2027-01-06T23:30");
  });
});

describe("checkRepeat", () => {
  it("needs 2 to 52 sessions, or an end date after the first", () => {
    expect(checkRepeat("2026-10-28T08:00", { everyWeeks: 1, ends: { after: 1 } })).not.toBeNull();
    expect(checkRepeat("2026-10-28T08:00", { everyWeeks: 1, ends: { after: 10 } })).toBeNull();
    expect(checkRepeat("2026-10-28T08:00", { everyWeeks: 1, ends: { on: "2026-10-28" } })).not.toBeNull();
    expect(checkRepeat("2026-10-28T08:00", null)).toBeNull();
  });
});

describe("findClashes", () => {
  const existing = [{ id: "a", startsAt: "2026-10-28T08:00:00+02:00", durationMinutes: 45, patientName: "Thandi M" }];

  it("finds overlaps but lets sessions sit back to back", () => {
    expect(findClashes(["2026-10-28T06:30:00.000Z"], 45, existing)).toHaveLength(1);
    expect(findClashes(["2026-10-28T06:45:00.000Z"], 45, existing)).toHaveLength(0);
    expect(findClashes(["2026-10-28T05:15:00.000Z"], 45, existing)).toHaveLength(0);
  });
});
