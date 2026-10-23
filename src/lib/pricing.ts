/**
 * Prices for invoice lines (decision 0008). A practice's price is the medical aid rate moved up or
 * down by its price adjustment. All amounts are whole cents and VAT inclusive.
 */

export type Rate = {
  billingCodeId: string;
  medicalAidId: string;
  rateCents: number | null;
  effectiveFrom: string; // YYYY-MM-DD
};

/** The medical aid every patient is priced from until we hold other medical aids' rates. */
export const DEFAULT_MEDICAL_AID = "Discovery Health Medical Scheme";

/** Applies a whole-percent price adjustment to a rate, rounding to the nearest cent. */
export function adjustPrice(rateCents: number, adjustmentPercent: number): number {
  if (!Number.isInteger(rateCents) || !Number.isInteger(adjustmentPercent)) {
    throw new Error("Rates are whole cents and adjustments whole percent");
  }
  return Math.round((rateCents * (100 + adjustmentPercent)) / 100);
}

/**
 * The rate for a billing code on a date: the patient's medical aid if we have its rate,
 * otherwise the default medical aid's. Undefined means we have no rate at all.
 */
export function findRate(
  rates: Rate[],
  billingCodeId: string,
  medicalAidIds: { patient: string | null; fallback: string },
  onDate: string,
): Rate | undefined {
  const latest = (medicalAidId: string | null) =>
    rates
      .filter(
        (rate) =>
          rate.billingCodeId === billingCodeId &&
          rate.medicalAidId === medicalAidId &&
          rate.effectiveFrom <= onDate,
      )
      .sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom))[0];
  return latest(medicalAidIds.patient) ?? latest(medicalAidIds.fallback);
}

/**
 * The practice's price for a code, or null when the practitioner must type it in:
 * the medical aid has no fixed amount, or pays nothing for it.
 */
export function practicePrice(rate: Rate | undefined, adjustmentPercent: number): number | null {
  if (!rate || rate.rateCents === null || rate.rateCents === 0) return null;
  return adjustPrice(rate.rateCents, adjustmentPercent);
}

export type PricedLine = { quantity: number; unitPriceCents: number };

export function lineTotal(line: PricedLine): number {
  return line.quantity * line.unitPriceCents;
}

export function invoiceTotal(lines: PricedLine[]): number {
  return lines.reduce((total, line) => total + lineTotal(line), 0);
}
