import { describe, expect, it } from "vitest";
import type { InvoiceDocument } from "./invoice-document";
import { invoicePdfName, renderInvoicePdf } from "./invoice-pdf";

const invoice = {
  id: "1",
  number: 7,
  issuedOn: "2026-10-27",
  dueOn: "2026-11-26",
  toMedicalAid: true,
  medicalAidId: "discovery",
  practice: { name: "Test OT", address: "1 Main Road", practice_number: "0661234", hpcsa_number: "OT 0012345" },
  patient: { patient_name: "Zoë Mokoena", medical_aid_name: "Discovery", member_number: "123", dependant_code: "01", date_of_birth: "2015-06-01" },
  lines: [{ id: "a", code: "R001", description: "Assessment", icd10Codes: ["M54.5"], quantity: 1, unitPriceCents: 85050 }],
  totalCents: 85050,
  session: { id: "s", startsAt: "2026-10-27T07:00:00.000Z", durationMinutes: 45, outcome: "attended", note: null },
} as InvoiceDocument;

describe("renderInvoicePdf", () => {
  it("makes a PDF", async () => {
    const pdf = await renderInvoicePdf(invoice);
    expect(pdf.subarray(0, 5).toString()).toBe("%PDF-");
  });

  it("makes a PDF with the practice's logo", async () => {
    // A 1×1 teal PNG.
    const png = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR4nGPgq2kDAAGsARHP+R6eAAAAAElFTkSuQmCC",
      "base64",
    );
    const pdf = await renderInvoicePdf(invoice, { data: png, format: "png" });
    expect(pdf.subarray(0, 5).toString()).toBe("%PDF-");
    expect(pdf.includes("/Subtype /Image")).toBe(true);
  });

  it("names the file with the invoice number and patient, in plain characters", () => {
    expect(invoicePdfName(invoice)).toBe("INV-0007 Zo Mokoena.pdf");
  });
});
