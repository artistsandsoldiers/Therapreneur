import type { SupabaseClient } from "@supabase/supabase-js";
import type { Practice } from "./practice";
import { invoiceTotal } from "./pricing";
import type { Database, Json } from "./supabase/database.types";

/** The patient and medical aid details printed on an invoice. A claimed invoice keeps the ones it was sent with. */
export type BilledPatient = {
  patient_name: string;
  date_of_birth: string | null;
  dependant_code: string | null;
  medical_aid_name: string | null;
  plan: string | null;
  member_number: string | null;
  main_member_name: string | null;
  referring_doctor_name: string | null;
  referring_doctor_practice_number: string | null;
};

/** An invoice with everything needed to show it, print it as a PDF, or put it in a claim email. */
export type InvoiceDocument = {
  id: string;
  number: number;
  issuedOn: string;
  dueOn: string;
  toMedicalAid: boolean;
  /** The patient's medical aid now, which decides the claim batch an unclaimed invoice goes in. */
  medicalAidId: string | null;
  practice: Practice;
  patient: BilledPatient;
  lines: { id: string; code: string; description: string; icd10Codes: string[]; quantity: number; unitPriceCents: number }[];
  totalCents: number;
  session: { id: string; startsAt: string; outcome: Database["public"]["Enums"]["session_outcome"]; note: string | null };
  /** Set once the invoice's claim batch has been sent. A claimed invoice can't be fixed or deleted. */
  claim: { batchId: string; sentAt: string; referenceNumber: string | null } | null;
};

const SELECT =
  "*, invoice_lines(*), claim_batches(id, sent_at, reference_number), sessions(id, starts_at, outcome, note, patients(*, medical_aids(name)))";

/** Loads invoices by id, oldest first, in the shape above. Invoices the practice can't see are left out. */
export async function loadInvoiceDocuments(
  supabase: SupabaseClient<Database>,
  practice: Practice,
  ids: string[],
): Promise<InvoiceDocument[]> {
  if (ids.length === 0) return [];
  const { data, error } = await supabase.from("invoices").select(SELECT).in("id", ids).order("number");
  if (error) throw error;

  return data.flatMap((invoice) => {
    const session = invoice.sessions;
    const patient = session?.patients;
    if (!session || !patient) return [];

    const batch = invoice.claim_batches;
    const claim = batch?.sent_at ? { batchId: batch.id, sentAt: batch.sent_at, referenceNumber: batch.reference_number } : null;
    const lines = [...invoice.invoice_lines]
      .sort((a, b) => a.position - b.position)
      .map((line) => ({
        id: line.id,
        code: line.code,
        description: line.description,
        icd10Codes: line.icd10_codes,
        quantity: line.quantity,
        unitPriceCents: line.unit_price_cents,
      }));

    return [
      {
        id: invoice.id,
        number: invoice.number,
        issuedOn: invoice.issued_on,
        dueOn: invoice.due_on,
        toMedicalAid: invoice.bill_to === "medical_aid",
        medicalAidId: patient.medical_aid_id,
        practice,
        patient:
          claim && invoice.claimed_details
            ? (invoice.claimed_details as Json as BilledPatient)
            : {
                patient_name: `${patient.first_name} ${patient.last_name}`,
                date_of_birth: patient.date_of_birth,
                dependant_code: patient.dependant_code,
                medical_aid_name: patient.medical_aids?.name ?? null,
                plan: patient.plan,
                member_number: patient.member_number,
                main_member_name: patient.main_member_name,
                referring_doctor_name: patient.referring_doctor_name,
                referring_doctor_practice_number: patient.referring_doctor_practice_number,
              },
        lines,
        totalCents: invoiceTotal(lines),
        session: { id: session.id, startsAt: session.starts_at, outcome: session.outcome, note: session.note },
        claim,
      },
    ];
  });
}

export async function loadInvoiceDocument(supabase: SupabaseClient<Database>, practice: Practice, id: string) {
  const [invoice] = await loadInvoiceDocuments(supabase, practice, [id]);
  return invoice ?? null;
}
