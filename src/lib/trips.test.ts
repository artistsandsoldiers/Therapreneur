import { describe, expect, it } from "vitest";
import { businessPart, businessShare, carOn, isBusinessTrip, missingDistances, pairKey, workOutTrips, type Stop, type Visit } from "./trips";

const HOME = "1 Home St";
const rooms: Stop = { kind: "place", id: "r", name: "My rooms", address: "2 Rooms Rd", regular: true };
const hospital: Stop = { kind: "place", id: "h", name: "Hospital", address: "3 Hospital Ave", regular: false };
const thandi: Stop = { kind: "patient", id: "t", name: "Thandi M", address: "4 Oak Ave" };
const sam: Stop = { kind: "patient", id: "s", name: "Sam K", address: "5 Elm St" };
const home: Stop = { kind: "home", address: HOME };

const cautious = { homeToPatientIsBusiness: false };
const relaxed = { homeToPatientIsBusiness: true };

// 2 Nov 2026 in South Africa, at a given hour.
const at = (hour: number, day = 2) => new Date(Date.UTC(2026, 10, day, hour - 2)).toISOString();
const visit = (hour: number, stop: Stop | null, day = 2): Visit => ({
  startsAt: at(hour, day),
  stop,
  reason: stop?.kind === "patient" ? `Home visit: ${stop.name}` : "Sessions",
  anonymousReason: stop?.kind === "patient" ? "Home visit" : "Sessions",
});

const distances = new Map([
  [pairKey(HOME, "2 Rooms Rd"), 10],
  [pairKey("2 Rooms Rd", "4 Oak Ave"), 6],
  [pairKey("4 Oak Ave", "5 Elm St"), 3.5],
  [pairKey("5 Elm St", HOME), 8],
  [pairKey("4 Oak Ave", HOME), 7],
]);

const summary = (trips: ReturnType<typeof workOutTrips>) =>
  trips.map((t) => `${t.from.kind === "place" ? t.from.name : t.from.kind}>${t.to.kind === "place" ? t.to.name : t.to.kind}:${t.business ? "B" : "P"}:${t.km}`);

describe("isBusinessTrip", () => {
  it("counts home to a regular place as private, and a non-regular place as business", () => {
    expect(isBusinessTrip(home, rooms, cautious)).toBe(false);
    expect(isBusinessTrip(rooms, home, cautious)).toBe(false);
    expect(isBusinessTrip(home, hospital, cautious)).toBe(true);
  });

  it("follows the cautious setting for home to a patient's home", () => {
    expect(isBusinessTrip(home, thandi, cautious)).toBe(false);
    expect(isBusinessTrip(thandi, home, relaxed)).toBe(true);
  });

  it("counts every trip that doesn't touch home as business", () => {
    expect(isBusinessTrip(rooms, thandi, cautious)).toBe(true);
    expect(isBusinessTrip(thandi, sam, cautious)).toBe(true);
    expect(isBusinessTrip(home, { kind: "address", address: "School" }, cautious)).toBe(true);
  });
});

describe("workOutTrips", () => {
  it("chains a day from home through each stop and back", () => {
    const trips = workOutTrips([visit(9, rooms), visit(10, rooms), visit(13, thandi), visit(15, sam)], HOME, distances, cautious);
    expect(summary(trips)).toEqual(["home>My rooms:P:10", "My rooms>patient:B:6", "patient>patient:B:3.5", "patient>home:P:8"]);
    expect(trips.every((t) => t.date === "2026-11-02")).toBe(true);
    expect(trips[1].reason).toBe("Home visit: Thandi M");
    expect(trips[3].reason).toBe("Home after work");
  });

  it("counts home visits from home as business once the cautious setting is off", () => {
    expect(summary(workOutTrips([visit(9, thandi)], HOME, distances, relaxed))).toEqual(["home>patient:B:7", "patient>home:B:7"]);
  });

  it("keeps days apart, skips visits with no place, and needs a distance for each pair", () => {
    const trips = workOutTrips([visit(9, rooms, 3), visit(11, null, 3), visit(9, hospital, 2)], HOME, distances, cautious);
    expect(summary(trips)).toEqual(["home>Hospital:B:null", "Hospital>home:B:null", "home>My rooms:P:10", "My rooms>home:P:10"]);
  });

  it("makes no trip between two stops at the same address", () => {
    const sibling: Stop = { ...sam, id: "s2", address: " 5 elm st" };
    expect(summary(workOutTrips([visit(9, sam), visit(10, sibling)], HOME, distances, relaxed))).toEqual(["home>patient:B:8", "patient>home:B:8"]);
  });

  it("leaves km empty without a home address", () => {
    expect(workOutTrips([visit(9, thandi)], null, distances, relaxed).map((t) => t.km)).toEqual([null, null]);
  });
});

describe("missingDistances", () => {
  it("lists business trips' missing pairs once, most used first", () => {
    const trips = workOutTrips([visit(9, hospital), visit(9, hospital, 3), visit(9, rooms, 4)], HOME, new Map(), cautious);
    expect(missingDistances(trips)).toEqual([
      { key: pairKey(HOME, "3 Hospital Ave"), from: HOME, to: "3 Hospital Ave", fromLabel: "Home", toLabel: "Hospital", trips: 4 },
    ]);
  });
});

describe("carOn", () => {
  const cars = [
    { id: "old", started_on: "2026-03-01", ended_on: "2026-08-01" },
    { id: "new", started_on: "2026-08-01", ended_on: null },
  ];

  it("picks the car in use, with the new car on the day of a change", () => {
    expect(carOn(cars, "2026-07-31")?.id).toBe("old");
    expect(carOn(cars, "2026-08-01")?.id).toBe("new");
    expect(carOn(cars, "2026-02-28")).toBeNull();
  });
});

describe("businessShare", () => {
  const trips = [
    { date: "2026-03-01", km: 20, business: true },
    { date: "2026-04-10", km: 30, business: true },
    { date: "2026-04-10", km: 10, business: false },
    { date: "2026-05-01", km: 50, business: true },
    { date: "2026-06-01", km: null, business: true },
  ];

  it("divides business km between readings by the km the odometer moved", () => {
    expect(businessShare(trips, [{ readOn: "2026-03-01", km: 10000 }, { readOn: "2026-05-01", km: 10200 }])).toEqual({
      share: 0.25,
      businessKm: 50,
      totalKm: 200,
      from: "2026-03-01",
      to: "2026-05-01",
    });
  });

  it("waits for two readings, and never goes over 100%", () => {
    expect(businessShare(trips, [{ readOn: "2026-03-01", km: 10000 }]).share).toBeNull();
    expect(businessShare(trips, [{ readOn: "2026-03-01", km: 10000 }, { readOn: "2026-06-02", km: 10010 }]).share).toBe(1);
  });
});

describe("businessPart", () => {
  it("rounds to whole cents", () => {
    expect(businessPart(100001, 0.25)).toBe(25000);
    expect(businessPart(99999, 1 / 3)).toBe(33333);
  });
});
