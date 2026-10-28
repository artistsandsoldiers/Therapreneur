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
      has_medical_aid: "yes",
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

  it("needs a real past date of birth for patients with medical aid, but not without", () => {
    expect(parsePatientForm(form({ patient_is_main_member: "yes", date_of_birth: "" })).ok).toBe(false);
    expect(parsePatientForm(form({ patient_is_main_member: "yes", date_of_birth: "2015-02-30" })).ok).toBe(false);
    expect(parsePatientForm(form({ patient_is_main_member: "yes", date_of_birth: "2999-01-01" })).ok).toBe(false);
    expect(parsePatientForm(form({ has_medical_aid: "no", date_of_birth: "" })).ok).toBe(true);
  });

  it("keeps medical aid details when the patient pays the practice", () => {
    const parsed = parsePatientForm(form({ patient_is_main_member: "yes", bill_to: "patient" }));
    expect(parsed.ok && parsed.patient).toMatchObject({ bill_to: "patient", medical_aid_id: "discovery", member_number: "123" });
  });

  it("bills a patient without medical aid to the patient", () => {
    const parsed = parsePatientForm(form({ has_medical_aid: "no", bill_to: "medical_aid" }));
    expect(parsed.ok && parsed.patient).toMatchObject({ bill_to: "patient", medical_aid_id: null });
  });
});
