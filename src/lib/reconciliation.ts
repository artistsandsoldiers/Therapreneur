import type { SupabaseClient } from "@supabase/supabase-js";
import { invoiceTotal } from "./pricing";
import type { Database } from "./supabase/database.types";

/** A sent claim that hasn't been paid yet, waiting for its medical aid's remittance. */
export type OutstandingClaim = {
  id: string;
  number: number;
  issuedOn: string;
  patientName: string;
  memberNumber: string | null;
  totalCents: number;
  medicalAidId: string;
  medicalAidName: string;
  claimedOn: string;
  referenceNumber: string | null;
};

/** Every outstanding claim, oldest invoice first. Optionally just one medical aid's. */
export async function loadOutstandingClaims(
  supabase: SupabaseClient<Database>,
  medicalAidId?: string,
): Promise<OutstandingClaim[]> {
  let query = supabase
    .from("invoices")
    .select(
      "id, number, issued_on, claimed_details, invoice_lines(quantity, unit_price_cents), claim_batches!inner(sent_at, reference_number, medical_aid_id, medical_aids(name))",
    )
    .is("paid_on", null)
    .not("claim_batches.sent_at", "is", null)
    .order("issued_on")
    .order("number");
  if (medicalAidId) query = query.eq("claim_batches.medical_aid_id", medicalAidId);
  const { data, error } = await query;
  if (error) throw error;

  return data.map((invoice) => {
    const batch = invoice.claim_batches;
    const details = (invoice.claimed_details ?? {}) as { patient_name?: string; member_number?: string | null };
    return {
      id: invoice.id,
      number: invoice.number,
      issuedOn: invoice.issued_on,
      patientName: details.patient_name ?? "Unknown patient",
      memberNumber: details.member_number ?? null,
      totalCents: invoiceTotal(
        invoice.invoice_lines.map((line) => ({ quantity: line.quantity, unitPriceCents: line.unit_price_cents })),
      ),
      medicalAidId: batch.medical_aid_id,
      medicalAidName: batch.medical_aids?.name ?? "Unknown medical aid",
      claimedOn: batch.sent_at!,
      referenceNumber: batch.reference_number,
    };
  });
}

export type MedicalAidClaims = { medicalAidId: string; name: string; claims: OutstandingClaim[]; totalCents: number };

/** Groups outstanding claims by medical aid, in alphabetical order, keeping each group's claims in order. */
export function groupByMedicalAid(claims: OutstandingClaim[]): MedicalAidClaims[] {
  const groups = new Map<string, MedicalAidClaims>();
  for (const claim of claims) {
    const group = groups.get(claim.medicalAidId) ?? { medicalAidId: claim.medicalAidId, name: claim.medicalAidName, claims: [], totalCents: 0 };
    group.claims.push(claim);
    group.totalCents += claim.totalCents;
    groups.set(claim.medicalAidId, group);
  }
  return [...groups.values()].sort((a, b) => a.name.localeCompare(b.name));
}

export type RemittanceDetails = { paidOn: string; reference: string; invoiceIds: string[] };

/** Validates the remittance form. `today` is YYYY-MM-DD in South Africa. */
export function parseRemittanceForm(form: FormData, today: string): { ok: true; details: RemittanceDetails } | { ok: false; error: string } {
  const paidOn = String(form.get("paid_on") ?? "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(paidOn) || Number.isNaN(Date.parse(paidOn))) {
    return { ok: false, error: "Please choose the date the medical aid paid." };
  }
  if (paidOn > today) return { ok: false, error: "The paid date can't be in the future." };

  const reference = String(form.get("reference") ?? "").trim();
  if (reference.length > 100) return { ok: false, error: "The reference is too long. Please shorten it." };

  const invoiceIds = [...new Set(form.getAll("invoice").map(String))];
  if (invoiceIds.length === 0) return { ok: false, error: "Please tick the claims this remittance paid." };

  return { ok: true, details: { paidOn, reference, invoiceIds } };
}
