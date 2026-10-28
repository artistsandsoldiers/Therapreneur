/**
 * Performance (docs/features/performance.md): income per patient and what's outstanding by age. Periods are in periods.ts.
 * All amounts are whole cents. An invoice is paid in full on its paid date, or outstanding until then.
 */

export type ReportInvoice = {
  id: string;
  number: number;
  issuedOn: string; // YYYY-MM-DD
  paidOn: string | null; // YYYY-MM-DD
  totalCents: number;
  patientId: string;
  patientName: string;
  /** The medical aid's name for a medical aid invoice, or null when the patient pays cash. */
  medicalAidName: string | null;
  /** Who referred the patient, as the patient's details say now. Null when no one is recorded. */
  referrer: { id: string; name: string } | null;
};

export type MonthIncome = { month: string; invoicedCents: number; paidCents: number }; // month is YYYY-MM

export type PatientIncome = {
  patientId: string;
  patientName: string;
  payerType: "Medical aid" | "Patient";
  invoicedCents: number;
  paidCents: number;
  outstandingCents: number;
};

/** Every patient with an invoice, biggest invoiced total first. Payer type follows their latest invoice. */
export function incomeByPatient(invoices: ReportInvoice[]): PatientIncome[] {
  const patients = new Map<string, PatientIncome>();
  const latest = new Map<string, number>();
  for (const invoice of invoices) {
    const patient = patients.get(invoice.patientId) ?? {
      patientId: invoice.patientId,
      patientName: invoice.patientName,
      payerType: "Patient",
      invoicedCents: 0,
      paidCents: 0,
      outstandingCents: 0,
    };
    if (invoice.number > (latest.get(invoice.patientId) ?? -1)) {
      latest.set(invoice.patientId, invoice.number);
      patient.payerType = invoice.medicalAidName ? "Medical aid" : "Patient";
    }
    patient.invoicedCents += invoice.totalCents;
    if (invoice.paidOn) patient.paidCents += invoice.totalCents;
    else patient.outstandingCents += invoice.totalCents;
    patients.set(invoice.patientId, patient);
  }
  return [...patients.values()].sort((a, b) => b.invoicedCents - a.invoicedCents || a.patientName.localeCompare(b.patientName));
}

export type ReferrerIncome = {
  /** Null for patients with no referrer. */
  referrerId: string | null;
  name: string;
  patientCount: number;
  invoicedCents: number;
  paidCents: number;
};

/** Income per referrer, biggest invoiced total first, with patients who have no referrer last. */
export function incomeByReferrer(invoices: ReportInvoice[]): ReferrerIncome[] {
  const referrers = new Map<string | null, ReferrerIncome & { patients: Set<string> }>();
  for (const invoice of invoices) {
    const id = invoice.referrer?.id ?? null;
    const row = referrers.get(id) ?? {
      referrerId: id,
      name: invoice.referrer?.name ?? "No referrer",
      patientCount: 0,
      invoicedCents: 0,
      paidCents: 0,
      patients: new Set<string>(),
    };
    row.patients.add(invoice.patientId);
    row.invoicedCents += invoice.totalCents;
    if (invoice.paidOn) row.paidCents += invoice.totalCents;
    referrers.set(id, row);
  }
  return [...referrers.values()]
    .map(({ patients, ...row }) => ({ ...row, patientCount: patients.size }))
    .sort((a, b) =>
      a.referrerId === null ? 1 : b.referrerId === null ? -1 : b.invoicedCents - a.invoicedCents || a.name.localeCompare(b.name),
    );
}

/** The invoices for one referrer's patients: a referrer id, "none" for patients with no referrer, or "" for everyone. */
export function forReferrer(invoices: ReportInvoice[], referrer: string): ReportInvoice[] {
  if (!referrer) return invoices;
  return invoices.filter((invoice) => (invoice.referrer?.id ?? "none") === referrer);
}

export const AGE_BUCKETS = ["0–30 days", "31–60 days", "61–90 days", "90+ days"] as const;

/** Whole days from the invoice date to today. */
export function daysOld(issuedOn: string, today: string): number {
  return Math.round((Date.parse(today) - Date.parse(issuedOn.slice(0, 10))) / 86_400_000);
}

/** Which of AGE_BUCKETS an invoice falls in, by its age in days. */
export function ageBucket(days: number): number {
  if (days <= 30) return 0;
  if (days <= 60) return 1;
  if (days <= 90) return 2;
  return 3;
}

export type OutstandingRow = { payer: string; bucketCents: number[]; totalCents: number };

export type Outstanding = {
  /** One row per medical aid, alphabetically, then patients. */
  rows: OutstandingRow[];
  totals: OutstandingRow;
  /** Unpaid invoices, oldest first, so the ones to chase come first. */
  invoices: (ReportInvoice & { days: number })[];
};

export function outstanding(invoices: ReportInvoice[], today: string): Outstanding {
  const unpaid = invoices
    .filter((invoice) => !invoice.paidOn)
    .map((invoice) => ({ ...invoice, days: daysOld(invoice.issuedOn, today) }))
    .sort((a, b) => b.days - a.days || a.number - b.number);

  const emptyRow = (payer: string): OutstandingRow => ({ payer, bucketCents: AGE_BUCKETS.map(() => 0), totalCents: 0 });
  const rows = new Map<string, OutstandingRow>();
  const totals = emptyRow("Total");
  for (const invoice of unpaid) {
    const payer = invoice.medicalAidName ?? "Patients";
    const row = rows.get(payer) ?? emptyRow(payer);
    const bucket = ageBucket(invoice.days);
    for (const target of [row, totals]) {
      target.bucketCents[bucket] += invoice.totalCents;
      target.totalCents += invoice.totalCents;
    }
    rows.set(payer, row);
  }

  const sorted = [...rows.values()].sort((a, b) =>
    a.payer === "Patients" ? 1 : b.payer === "Patients" ? -1 : a.payer.localeCompare(b.payer),
  );
  return { rows: sorted, totals, invoices: unpaid };
}
