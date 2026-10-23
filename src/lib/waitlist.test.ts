import { describe, expect, it } from "vitest";
import { parseWaitlistForm } from "./waitlist";

function form(fields: Record<string, string>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.set(key, value);
  return data;
}

const valid = {
  name: " Robynne Stock ",
  email: " Robs@Example.co.za ",
  occupation: "Occupational therapist",
};

describe("parseWaitlistForm", () => {
  it("trims the name and normalises the email", () => {
    expect(parseWaitlistForm(form(valid))).toEqual({
      ok: true,
      signup: {
        name: "Robynne Stock",
        email: "robs@example.co.za",
        occupation: "Occupational therapist",
        source: null,
      },
    });
  });

  it("keeps where the visitor came from", () => {
    const result = parseWaitlistForm(form({ ...valid, source: "otasa-survey" }));
    expect(result.ok && result.signup.source).toBe("otasa-survey");
  });

  it("rejects a missing name, bad email or unknown occupation", () => {
    expect(parseWaitlistForm(form({ ...valid, name: "  " })).ok).toBe(false);
    expect(parseWaitlistForm(form({ ...valid, email: "robs@" })).ok).toBe(false);
    expect(parseWaitlistForm(form({ ...valid, occupation: "Dentist" })).ok).toBe(false);
  });
});
