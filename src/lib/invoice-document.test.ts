import { describe, expect, it } from "vitest";
import { billToLines, type BilledPatient } from "./invoice-document";

const patient: BilledPatient = {
  patient_name: "Thandi Mokoena",
  date_of_birth: "2015-06-01",
  dependant_code: "01",
  medical_aid_name: "Discovery Health Medical Scheme",
  plan: "Classic Saver",
  member_number: "123",
  main_member_name: "Sipho Mokoena",
  referring_doctor_name: null,
  referring_doctor_practice_number: null,
};

describe("billToLines", () => {
  it("addresses a medical aid invoice to the medical aid", () => {
    expect(billToLines({ toMedicalAid: true, patient })).toEqual([
      "Discovery Health Medical Scheme",
      "Main member: Sipho Mokoena",
      "Member no. 123 · Dependant 01 · Classic Saver",
      "Patient: Thandi Mokoena · Born 01/06/2015",
    ]);
  });

  it("addresses a patient who pays to them, with their medical aid details so they can claim back", () => {
    const lines = billToLines({ toMedicalAid: false, patient });
    expect(lines[0]).toBe("Thandi Mokoena");
    expect(lines).toContain("Medical aid: Discovery Health Medical Scheme · Classic Saver");
    expect(lines).toContain("Member no. 123 · Dependant 01");
  });

  it("shows just the patient when they have no medical aid", () => {
    const none = { ...patient, medical_aid_name: null, date_of_birth: null };
    expect(billToLines({ toMedicalAid: false, patient: none })).toEqual(["Thandi Mokoena"]);
  });
});
