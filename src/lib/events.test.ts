import { describe, expect, it } from "vitest";
import { eventTitle, parseEventInput, parseSessionWhere, whereValue } from "./events";

const places = [{ id: "p1", name: "Rooms", address: "1 Main Rd", regular: true }];
const input = { kind: "meeting", title: "", startsAt: "2026-11-02T09:00", durationMinutes: 60, where: "p1", address: "" };

describe("parseEventInput", () => {
  it("reads an event at one of the practice's places", () => {
    expect(parseEventInput(input, places)).toEqual({
      ok: true,
      row: { kind: "meeting", title: null, starts_at: "2026-11-02T07:00:00.000Z", duration_minutes: 60, place_id: "p1", address: null },
    });
  });

  it("reads an event at an address typed in", () => {
    expect(parseEventInput({ ...input, where: "elsewhere", address: " 9 School Rd ", title: " School visit " }, places)).toMatchObject({
      ok: true,
      row: { title: "School visit", place_id: null, address: "9 School Rd" },
    });
    expect(parseEventInput({ ...input, where: "elsewhere" }, places).ok).toBe(false);
  });

  it("refuses unknown kinds and places, and lengths over 12 hours", () => {
    expect(parseEventInput({ ...input, kind: "party" }, places).ok).toBe(false);
    expect(parseEventInput({ ...input, where: "p2" }, places).ok).toBe(false);
    expect(parseEventInput({ ...input, durationMinutes: 721 }, places).ok).toBe(false);
    expect(parseEventInput({ ...input, durationMinutes: 720 }, places).ok).toBe(true);
  });
});

describe("parseSessionWhere and whereValue", () => {
  it("reads a place, the patient's home, or not set", () => {
    expect(parseSessionWhere("p1", places)).toEqual({ ok: true, columns: { place_id: "p1", at_patient_home: false } });
    expect(parseSessionWhere("home", places)).toEqual({ ok: true, columns: { place_id: null, at_patient_home: true } });
    expect(parseSessionWhere("", places)).toEqual({ ok: true, columns: { place_id: null, at_patient_home: false } });
    expect(parseSessionWhere("p2", places).ok).toBe(false);
  });

  it("turns a session's columns back into the picker's value", () => {
    expect(whereValue({ place_id: "p1", at_patient_home: false })).toBe("p1");
    expect(whereValue({ place_id: null, at_patient_home: true })).toBe("home");
    expect(whereValue({ place_id: null, at_patient_home: false })).toBe("");
  });
});

describe("eventTitle", () => {
  it("uses the title, or the kind when there's none", () => {
    expect(eventTitle({ kind: "errand", title: null })).toBe("Errand");
    expect(eventTitle({ kind: "training", title: "Sensory CPD" })).toBe("Sensory CPD");
  });
});
