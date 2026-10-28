import { describe, expect, it } from "vitest";
import { formatDate, formatDateTime, formatSessionTime, friendlyDate, friendlyDateTime, friendlySessionTime, fromLocalInput, toLocalInput } from "./dates";

describe("dates", () => {
  it("formats dates the South African way", () => {
    expect(formatDate("2026-10-03")).toBe("03/10/2026");
  });

  it("shows session times in South African time", () => {
    expect(formatDateTime("2026-10-23T22:30:00Z")).toBe("24/10/2026 00:30");
  });

  it("round-trips a time typed on the phone", () => {
    const iso = fromLocalInput("2026-10-23T14:30");
    expect(iso).toBe("2026-10-23T12:30:00.000Z");
    expect(toLocalInput(new Date(iso!))).toBe("2026-10-23T14:30");
    expect(fromLocalInput("yesterday")).toBeNull();
  });
});

describe("formatSessionTime", () => {
  it("shows the start and end in South African time", () => {
    expect(formatSessionTime("2026-10-23T12:30:00.000Z", 45)).toBe("23/10/2026 14:30–15:15");
  });
});

describe("friendlyDate", () => {
  const now = new Date("2026-10-28T10:00:00+02:00"); // a Wednesday

  it("names days near today, with the weekday", () => {
    expect(friendlyDate("2026-10-28", now)).toBe("Today, Wed 28 Oct");
    expect(friendlyDate("2026-10-27", now)).toBe("Yesterday, Tue 27 Oct");
    expect(friendlyDate("2026-10-29", now)).toBe("Tomorrow, Thu 29 Oct");
    expect(friendlyDate("2026-10-25", now)).toBe("3 days ago, Sun 25 Oct");
    expect(friendlyDate("2026-10-31", now)).toBe("In 3 days, Sat 31 Oct");
  });

  it("drops the relative part from a week away, and adds the year when it isn't this year", () => {
    expect(friendlyDate("2026-10-21", now)).toBe("Wed 21 Oct");
    expect(friendlyDate("2025-12-01", now)).toBe("Mon 1 Dec 2025");
  });

  it("uses the South African day of a timestamp", () => {
    // 23:30 UTC on the 27th is 01:30 on the 28th in South Africa.
    expect(friendlyDate("2026-10-27T23:30:00.000Z", now)).toBe("Today, Wed 28 Oct");
    // Just after midnight South African time is still "today".
    expect(friendlyDate("2026-10-28", new Date("2026-10-28T00:05:00+02:00"))).toBe("Today, Wed 28 Oct");
  });

  it("adds the time, and a session's end time", () => {
    expect(friendlyDateTime("2026-10-28T12:30:00.000Z", now)).toBe("Today, Wed 28 Oct, 14:30");
    expect(friendlySessionTime("2026-10-28T12:30:00.000Z", 45, now)).toBe("Today, Wed 28 Oct, 14:30–15:15");
  });
});
