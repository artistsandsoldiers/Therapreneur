import { describe, expect, it } from "vitest";
import { formatDate, formatDateTime, formatSessionTime, fromLocalInput, toLocalInput } from "./dates";

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
