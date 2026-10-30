import { describe, expect, it } from "vitest";
import { checkReading, formatKm, parseKm, parsePlaceForm, parseReadingForm, parseStartCarForm, parseUsualPlace } from "./travel";

const form = (fields: Record<string, string>) => {
  const data = new FormData();
  for (const [name, value] of Object.entries(fields)) data.set(name, value);
  return data;
};

describe("parseKm and formatKm", () => {
  it("reads whole km with spaces or commas", () => {
    expect(parseKm("84 312")).toBe(84312);
    expect(parseKm("84,312")).toBe(84312);
    expect(parseKm("0")).toBe(0);
  });

  it("refuses anything else", () => {
    expect(parseKm("")).toBeNull();
    expect(parseKm("84.5")).toBeNull();
    expect(parseKm("-3")).toBeNull();
    expect(parseKm("12345678")).toBeNull();
  });

  it("shows km with a space every three digits", () => {
    expect(formatKm(84312)).toBe("84 312 km");
    expect(formatKm(950)).toBe("950 km");
    expect(formatKm(1234567)).toBe("1 234 567 km");
  });
});

describe("parsePlaceForm", () => {
  it("reads a regular place unless the advanced box is ticked", () => {
    expect(parsePlaceForm(form({ name: " My rooms ", address: "1 Main Rd" }))).toEqual({
      ok: true,
      place: { name: "My rooms", address: "1 Main Rd", regular: true },
    });
    expect(parsePlaceForm(form({ name: "Hospital", address: "2 Side St", not_regular: "yes" }))).toMatchObject({
      place: { regular: false },
    });
  });

  it("asks for a name and an address", () => {
    expect(parsePlaceForm(form({ address: "1 Main Rd" })).ok).toBe(false);
    expect(parsePlaceForm(form({ name: "My rooms" })).ok).toBe(false);
  });
});

describe("parseUsualPlace", () => {
  it("changes nothing when the form doesn't ask", () => {
    expect(parseUsualPlace(form({}))).toEqual({ ok: true, columns: {} });
  });

  it("reads one of the practice's places, or none", () => {
    expect(parseUsualPlace(form({ usual_place: "p1" }))).toEqual({ ok: true, columns: { seen_at_home: false, usual_place_id: "p1" } });
    expect(parseUsualPlace(form({ usual_place: "" }))).toEqual({ ok: true, columns: { seen_at_home: false, usual_place_id: null } });
  });

  it("needs a home address for home visits", () => {
    expect(parseUsualPlace(form({ usual_place: "home", home_address: " 5 Oak Ave " }))).toEqual({
      ok: true,
      columns: { seen_at_home: true, usual_place_id: null, home_address: "5 Oak Ave" },
    });
    expect(parseUsualPlace(form({ usual_place: "home" })).ok).toBe(false);
  });
});

describe("parseStartCarForm", () => {
  const car = { name: "White Polo", registration: "ca 123-456", started_on: "2026-10-01", km: "84 312" };

  it("reads the first car", () => {
    expect(parseStartCarForm(form(car), false, "2026-10-30")).toEqual({
      ok: true,
      car: { startedOn: "2026-10-01", name: "White Polo", registration: "CA 123-456", km: 84312, oldCarKm: null },
    });
  });

  it("needs the old car's last reading when changing car", () => {
    expect(parseStartCarForm(form(car), true, "2026-10-30").ok).toBe(false);
    expect(parseStartCarForm(form({ ...car, old_car_km: "150000" }), true, "2026-10-30")).toMatchObject({
      car: { oldCarKm: 150000 },
    });
  });

  it("refuses a start date in the future and a missing reading", () => {
    expect(parseStartCarForm(form(car), false, "2026-09-30").ok).toBe(false);
    expect(parseStartCarForm(form({ ...car, km: "" }), false, "2026-10-30").ok).toBe(false);
  });
});

describe("parseReadingForm", () => {
  it("reads a day and km, not in the future", () => {
    expect(parseReadingForm(form({ read_on: "2026-10-30", km: "85 000" }), "2026-10-30")).toEqual({
      ok: true,
      reading: { readOn: "2026-10-30", km: 85000 },
    });
    expect(parseReadingForm(form({ read_on: "2026-10-31", km: "85 000" }), "2026-10-30").ok).toBe(false);
  });
});

describe("checkReading", () => {
  const car = { id: "c1", name: "Polo", registration: null, started_on: "2026-03-01", ended_on: null };
  const readings = [
    { readOn: "2026-03-01", km: 80000 },
    { readOn: "2026-06-01", km: 85000 },
  ];

  it("accepts a reading between the ones around it", () => {
    expect(checkReading({ readOn: "2026-04-01", km: 82000 }, car, readings)).toBeNull();
    expect(checkReading({ readOn: "2026-10-01", km: 90000 }, car, readings)).toBeNull();
  });

  it("refuses an odometer that went backwards", () => {
    expect(checkReading({ readOn: "2026-04-01", km: 79000 }, car, readings)).toMatch(/lower/);
    expect(checkReading({ readOn: "2026-04-01", km: 86000 }, car, readings)).toMatch(/higher/);
  });

  it("lets a reading replace one on the same day", () => {
    expect(checkReading({ readOn: "2026-06-01", km: 84000 }, car, readings)).toBeNull();
  });

  it("refuses a day the car wasn't in use", () => {
    expect(checkReading({ readOn: "2026-02-01", km: 70000 }, car, readings)).toMatch(/outside/);
    expect(checkReading({ readOn: "2026-07-01", km: 86000 }, { ...car, ended_on: "2026-06-30" }, readings)).toMatch(/outside/);
  });
});
