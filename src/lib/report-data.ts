import type { SupabaseClient } from "@supabase/supabase-js";
import type { ReportExpense } from "./expenses";
import { loadBusinessShares } from "./logbook-data";
import type { ReportInvoice } from "./performance";
import type { Practice } from "./practice";
import { invoiceTotal } from "./pricing";
import type { Database } from "./supabase/database.types";
import { claimableCents, taxYearOfDate } from "./trips";

/**
 * Every invoice and expense, ready for the money sums on Performance and Home. Vehicle costs count only their
 * business share from the logbook.
 */
export async function loadReportData(
  supabase: SupabaseClient<Database>,
  practice: Practice,
): Promise<{ invoices: ReportInvoice[]; expenses: ReportExpense[] }> {
  const [invoiceRows, expenseRows] = await Promise.all([
    supabase
      .from("invoices")
      .select(
        "id, number, issued_on, paid_on, bill_to, claimed_details, invoice_lines(quantity, unit_price_cents), sessions(patients(id, first_name, last_name, medical_aids(name), referrers(id, name)))",
      ),
    supabase.from("expenses").select("spent_on, amount_cents, expense_categories(name, business_share)"),
  ]);
  if (invoiceRows.error) throw invoiceRows.error;
  if (expenseRows.error) throw expenseRows.error;

  const split = expenseRows.data.filter((e) => e.expense_categories?.business_share);
  const shares = split.length ? await loadBusinessShares(supabase, practice, split.map((e) => taxYearOfDate(e.spent_on))) : new Map();
  const expenses: ReportExpense[] = expenseRows.data.map((e) => {
    const businessShare = Boolean(e.expense_categories?.business_share);
    const name = e.expense_categories?.name ?? "Other";
    return {
      spentOn: e.spent_on,
      amountCents: claimableCents({ spentOn: e.spent_on, amountCents: e.amount_cents, businessShare }, shares),
      categoryName: businessShare ? `${name} (business share)` : name,
    };
  });

  const invoices: ReportInvoice[] = invoiceRows.data.flatMap((invoice) => {
    const patient = invoice.sessions?.patients;
    if (!patient) return [];
    // A claimed invoice keeps the medical aid it was sent to, even if the patient has moved since.
    const claimedAid = (invoice.claimed_details as { medical_aid_name?: string } | null)?.medical_aid_name;
    return [
      {
        id: invoice.id,
        number: invoice.number,
        issuedOn: invoice.issued_on,
        paidOn: invoice.paid_on,
        totalCents: invoiceTotal(
          invoice.invoice_lines.map((line) => ({ quantity: line.quantity, unitPriceCents: line.unit_price_cents })),
        ),
        patientId: patient.id,
        patientName: `${patient.first_name} ${patient.last_name}`,
        medicalAidName: invoice.bill_to === "medical_aid" ? (claimedAid ?? patient.medical_aids?.name ?? "Medical aid") : null,
        referrer: patient.referrers,
      },
    ];
  });

  return { invoices, expenses };
}
