import { describe, expect, it } from "vitest";
import { parseReferrerChoice } from "./referrers";

const form = (fields: Record<string, string>) => {
  const data = new FormData();
  for (const [name, value] of Object.entries(fields)) data.set(name, value);
  return data;
};

describe("parseReferrerChoice", () => {
  it("reads no referrer, or an existing one", () => {
    expect(parseReferrerChoice(form({}))).toEqual({ ok: true, choice: { type: "none" } });
    expect(parseReferrerChoice(form({ referrer_id: "r1" }))).toEqual({ ok: true, choice: { type: "existing", id: "r1" } });
  });

  it("reads a new referrer, keeping a practice number only for doctors", () => {
    expect(
      parseReferrerChoice(form({ referrer_id: "new", new_referrer_name: " Dr Naidoo ", new_referrer_kind: "doctor", new_referrer_practice_number: "123" })),
    ).toEqual({ ok: true, choice: { type: "new", name: "Dr Naidoo", kind: "doctor", practiceNumber: "123" } });
    expect(
      parseReferrerChoice(form({ referrer_id: "new", new_referrer_name: "Instagram", new_referrer_kind: "social_media", new_referrer_practice_number: "123" })),
    ).toEqual({ ok: true, choice: { type: "new", name: "Instagram", kind: "social_media", practiceNumber: null } });
  });

  it("asks for a name and a kind", () => {
    expect(parseReferrerChoice(form({ referrer_id: "new", new_referrer_kind: "website" })).ok).toBe(false);
    expect(parseReferrerChoice(form({ referrer_id: "new", new_referrer_name: "Google" })).ok).toBe(false);
  });
});
