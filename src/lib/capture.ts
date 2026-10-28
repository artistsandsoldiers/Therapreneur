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

/** The shortest and longest session we accept, in minutes. */
export const SESSION_MINUTES = { min: 5, max: 480 } as const;

export function isSessionLength(minutes: number): boolean {
  return Number.isInteger(minutes) && minutes >= SESSION_MINUTES.min && minutes <= SESSION_MINUTES.max;
}

export type PastInvoice = {
  sessionId: string;
  patientId: string;
  startsAt: string;
  lines: { billingCodeId: string | null; quantity: number; position: number }[];
};

/** A patient's billing codes from past sessions: their most used (for chips) and their latest invoice's lines. */
export type CodeHistory = { usual: string[]; last: { billingCodeId: string; quantity: number }[] };

/**
 * Each patient's code history, from their attended sessions' invoices. Usual codes are the six used on the most
 * invoices, the more recent first on a tie. A session being fixed is left out, so "same as last time" means the one before.
 */
export function codeHistories(invoices: PastInvoice[], excludeSessionId: string | null = null): Record<string, CodeHistory> {
  const byPatient = new Map<string, PastInvoice[]>();
  for (const invoice of invoices) {
    if (invoice.sessionId === excludeSessionId) continue;
    byPatient.set(invoice.patientId, [...(byPatient.get(invoice.patientId) ?? []), invoice]);
  }

  const histories: Record<string, CodeHistory> = {};
  for (const [patientId, patientInvoices] of byPatient) {
    const newestFirst = [...patientInvoices].sort((a, b) => b.startsAt.localeCompare(a.startsAt));
    const uses = new Map<string, { count: number; lastUsed: number }>();
    newestFirst.forEach((invoice, index) => {
      for (const id of new Set(invoice.lines.map((line) => line.billingCodeId))) {
        if (!id) continue;
        const use = uses.get(id) ?? { count: 0, lastUsed: index };
        uses.set(id, { count: use.count + 1, lastUsed: use.lastUsed });
      }
    });
    const usual = [...uses.entries()]
      .sort(([, a], [, b]) => b.count - a.count || a.lastUsed - b.lastUsed)
      .slice(0, 6)
      .map(([id]) => id);
    const last = [...(newestFirst[0]?.lines ?? [])]
      .sort((a, b) => a.position - b.position)
      .flatMap((line) => (line.billingCodeId ? [{ billingCodeId: line.billingCodeId, quantity: line.quantity }] : []));
    histories[patientId] = { usual, last };
  }
  return histories;
}
