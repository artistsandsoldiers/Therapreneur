import { describe, expect, it } from "vitest";
import { parseIcd10Codes, parsePatientForm } from "./patients";

describe("parseIcd10Codes", () => {
  it("reads codes separated by commas or spaces, in capitals, without repeats", () => {
    expect(parseIcd10Codes("m54.5, S52.50  m54.5")).toEqual({ ok: true, codes: ["M54.5", "S52.50"] });
    expect(parseIcd10Codes("")).toEqual({ ok: true, codes: [] });
  });

  it("rejects something that isn't a code", () => {
    expect(parseIcd10Codes("M54.5 back pain").ok).toBe(false);
  });
});

describe("parsePatientForm", () => {
  const form = (fields: Record<string, string>) => {
    const data = new FormData();
    for (const [name, value] of Object.entries({
      first_name: "Thandi",
      last_name: "Mokoena",
      payer_type: "medical_aid",
      medical_aid_id: "discovery",
      member_number: "123",
      date_of_birth: "2015-06-01",
      ...fields,
    })) data.set(name, value);
    return data;
  };

  it("makes the main member dependant 00", () => {
    const parsed = parsePatientForm(form({ patient_is_main_member: "yes" }));
    expect(parsed.ok && parsed.patient.dependant_code).toBe("00");
  });

  it("pads a dependant's code and needs one", () => {
    const parsed = parsePatientForm(form({ main_member_name: "Sipho Mokoena", dependant_code: "2" }));
    expect(parsed.ok && parsed.patient.dependant_code).toBe("02");
    expect(parsePatientForm(form({ main_member_name: "Sipho Mokoena" })).ok).toBe(false);
  });

  it("needs a real past date of birth for medical aid patients, but not for cash", () => {
    expect(parsePatientForm(form({ patient_is_main_member: "yes", date_of_birth: "" })).ok).toBe(false);
    expect(parsePatientForm(form({ patient_is_main_member: "yes", date_of_birth: "2015-02-30" })).ok).toBe(false);
    expect(parsePatientForm(form({ patient_is_main_member: "yes", date_of_birth: "2999-01-01" })).ok).toBe(false);
    expect(parsePatientForm(form({ payer_type: "cash", date_of_birth: "" })).ok).toBe(true);
  });
});
