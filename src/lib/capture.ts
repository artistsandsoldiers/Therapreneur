import { findRate, practicePrice, type Rate } from "./pricing";
import type { Enums } from "./supabase/database.types";

export type CaptureLineInput = {
  billingCodeId: string;
  quantity: number;
  /** Only used for codes without a fixed medical aid rate. */
  typedPriceCents: number | null;
};

export type CaptureContext = {
  rates: Rate[];
  patientMedicalAidId: string | null;
  defaultMedicalAidId: string;
  sessionDate: string; // YYYY-MM-DD
  adjustmentPercent: number;
  noShowCodeId: string;
  noShowPriceCents: number;
};

export type InvoiceLineInput = { billing_code_id: string; quantity: number; unit_price_cents: number };

/**
 * Works out the invoice lines for a capture. A no-show is one line at the practice's no-show price.
 * Otherwise each code is priced from the medical aid rate, or the price the practitioner typed when
 * there is no fixed rate. Runs on the server, so the database only ever stores prices worked out here.
 */
export function priceCapture(
  outcome: Enums<"session_outcome">,
  lines: CaptureLineInput[],
  context: CaptureContext,
): { ok: true; lines: InvoiceLineInput[] } | { ok: false; error: string } {
  if (outcome === "no_show") {
    return {
      ok: true,
      lines: [{ billing_code_id: context.noShowCodeId, quantity: 1, unit_price_cents: context.noShowPriceCents }],
    };
  }
  if (lines.length === 0) return { ok: false, error: "Please add at least one billing code." };

  const priced: InvoiceLineInput[] = [];
  for (const line of lines) {
    if (!Number.isInteger(line.quantity) || line.quantity < 1 || line.quantity > 99) {
      return { ok: false, error: "Each code's quantity must be between 1 and 99." };
    }
    const rate = findRate(
      context.rates,
      line.billingCodeId,
      { patient: context.patientMedicalAidId, fallback: context.defaultMedicalAidId },
      context.sessionDate,
    );
    const price = practicePrice(rate, context.adjustmentPercent) ?? line.typedPriceCents;
    if (price === null || !Number.isInteger(price) || price <= 0) {
      return { ok: false, error: "Please enter a price for each code that doesn't have a fixed rate." };
    }
    priced.push({ billing_code_id: line.billingCodeId, quantity: line.quantity, unit_price_cents: price });
  }
  return { ok: true, lines: priced };
}

/**
 * Who a session's invoice goes to. The practitioner chooses per session, starting from the patient's usual choice,
 * but a no-show is always the patient's to pay, and only a patient with medical aid can be billed to one.
 */
export function sessionBillTo(
  outcome: Enums<"session_outcome">,
  chosen: Enums<"bill_to">,
  patient: { medical_aid_id: string | null },
): Enums<"bill_to"> {
  if (outcome === "no_show" || !patient.medical_aid_id) return "patient";
  return chosen;
}
