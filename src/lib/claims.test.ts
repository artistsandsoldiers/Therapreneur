import { describe, expect, it } from "vitest";
import { claimEmail, claimSending, groupByMedicalAid, missingPracticeDetails } from "./claims";
import type { InvoiceDocument } from "./invoice-document";
import type { Practice } from "./practice";

describe("claimSending", () => {
  it("refuses to send without a test inbox, so a claim can never reach a real medical aid", () => {
    expect(claimSending({ RESEND_API_KEY: "re_123" }).ok).toBe(false);
    expect(claimSending({ RESEND_API_KEY: "re_123", CLAIMS_TEST_INBOX: "  " }).ok).toBe(false);
    expect(claimSending({ CLAIMS_TEST_INBOX: "test@example.com" }).ok).toBe(false);
  });

  it("sends to the test inbox from Resend's test address unless told otherwise", () => {
    expect(claimSending({ RESEND_API_KEY: "re_123", CLAIMS_TEST_INBOX: "test@example.com" })).toEqual({
      ok: true,
      sending: { apiKey: "re_123", to: "test@example.com", from: "onboarding@resend.dev" },
    });
  });
});

describe("missingPracticeDetails", () => {
  it("needs both the practice and HPCSA numbers", () => {
    expect(missingPracticeDetails({ practice_number: null, hpcsa_number: "OT 0012345" })).toEqual(["practice number"]);
    expect(missingPracticeDetails({ practice_number: "0661234", hpcsa_number: "OT 0012345" })).toEqual([]);
  });
});

describe("groupByMedicalAid", () => {
  it("makes one batch per medical aid and skips invoices without one", () => {
    const groups = groupByMedicalAid([
      { id: 1, medicalAidId: "discovery" },
      { id: 2, medicalAidId: "bonitas" },
      { id: 3, medicalAidId: "discovery" },
      { id: 4, medicalAidId: null },
    ]);
    expect([...groups]).toEqual([
      ["discovery", [{ id: 1, medicalAidId: "discovery" }, { id: 3, medicalAidId: "discovery" }]],
      ["bonitas", [{ id: 2, medicalAidId: "bonitas" }]],
    ]);
  });
});

describe("claimEmail", () => {
  const practice = { name: "Smith & Co OT", practice_number: "0661234", hpcsa_number: "OT 0012345", phone: null, email: "a@b.co" } as Practice;
  const invoice = {
    number: 7,
    issuedOn: "2026-10-27",
    totalCents: 85050,
    patient: { patient_name: "Thandi <b>Mokoena</b>", date_of_birth: "1980-02-01", member_number: "123", dependant_code: "01" },
    lines: [{ icd10Codes: ["M54.5"] }, { icd10Codes: ["M54.5", "S52.50"] }],
  } as InvoiceDocument;

  it("lists each claim with its patient, member and ICD-10 details and the total", () => {
    const email = claimEmail(practice, "Discovery Health Medical Scheme", [invoice], "test@example.com");
    expect(email.subject).toBe("Claims from Smith & Co OT (practice no. 0661234): 1 claim");
    expect(email.text).toContain("Invoice: INV-0007 | Patient: Thandi <b>Mokoena</b> | Date of birth: 01/02/1980");
    expect(email.text).toContain("ICD-10: M54.5, S52.50 | Amount: R850.50");
    expect(email.text).toContain("It went to test@example.com instead.");
  });

  it("escapes what practitioners typed, so it can't change the email's HTML", () => {
    const { html } = claimEmail(practice, "Discovery", [invoice], "test@example.com");
    expect(html).toContain("Thandi &lt;b&gt;Mokoena&lt;/b&gt;");
    expect(html).toContain("Smith &amp; Co OT");
  });
});
