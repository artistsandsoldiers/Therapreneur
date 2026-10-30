import { describe, expect, it } from "vitest";
import { logbookCsv } from "./logbook-export";
import type { CarLogbook } from "./logbook-data";

const logbook: CarLogbook = {
  car: {
    id: "c1",
    name: "White Polo",
    registration: "CA 123",
    started_on: "2026-03-01",
    ended_on: null,
    readings: [
      { id: "r1", readOn: "2026-03-01", km: 10000 },
      { id: "r2", readOn: "2026-10-01", km: 12000 },
    ],
  },
  trips: [
    {
      date: "2026-04-02",
      from: { kind: "place", id: "p", name: "My rooms", address: "1 Main Rd", regular: true },
      to: { kind: "patient", id: "t", name: "Thandi Mokoena", address: "4 Oak Ave" },
      business: true,
      reason: "Home visit: Thandi Mokoena",
      anonymousReason: "Home visit",
      km: 6.5,
    },
  ],
  businessKm: 6.5,
  share: { share: 0.00325, businessKm: 6.5, totalKm: 2000, from: "2026-03-01", to: "2026-10-01" },
};

describe("logbookCsv", () => {
  it("lists the car, readings and business trips", () => {
    const csv = logbookCsv(logbook, { practiceName: "Robynne Stock OT", year: 2026, anonymous: false });
    expect(csv).toContain("Car,White Polo\r\n");
    expect(csv).toContain("01/03/2026,10000\r\n");
    expect(csv).toContain("02/04/2026,My rooms,Thandi Mokoena's home,Home visit: Thandi Mokoena,6.5\r\n");
    expect(csv).toContain("Business share,0.3%\r\n");
    expect(csv).toContain("Total business km,6.5\r\n");
  });

  it("leaves out patient names when anonymous", () => {
    const csv = logbookCsv(logbook, { practiceName: "Robynne Stock OT", year: 2026, anonymous: true });
    expect(csv).toContain("02/04/2026,My rooms,Patient's home,Home visit,6.5\r\n");
    expect(csv).not.toContain("Thandi");
  });

  it("quotes cells with commas", () => {
    const csv = logbookCsv(logbook, { practiceName: "Stock, OT", year: 2026, anonymous: true });
    expect(csv).toContain('Travel logbook,"Stock, OT"\r\n');
  });
});
