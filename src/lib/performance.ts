/**
 * Performance (docs/features/performance.md): income per month, income per patient, and what's outstanding by age.
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
};

export type MonthIncome = { month: string; invoicedCents: number; paidCents: number }; // month is YYYY-MM

/** The last `count` months up to and including today's, oldest first, as YYYY-MM. */
export function lastMonths(today: string, count: number): string[] {
  const [year, month] = today.split("-").map(Number);
  return Array.from({ length: count }, (_, i) => {
    const date = new Date(Date.UTC(year, month - 1 - (count - 1 - i), 1));
    return date.toISOString().slice(0, 7);
  });
}

/** Invoiced counts in the month of the invoice date; paid counts in the month it was paid. */
export function incomeByMonth(invoices: ReportInvoice[], today: string, count = 6): MonthIncome[] {
  const months = new Map(lastMonths(today, count).map((month) => [month, { month, invoicedCents: 0, paidCents: 0 }]));
  for (const invoice of invoices) {
    const invoiced = months.get(invoice.issuedOn.slice(0, 7));
    if (invoiced) invoiced.invoicedCents += invoice.totalCents;
    const paid = invoice.paidOn ? months.get(invoice.paidOn.slice(0, 7)) : undefined;
    if (paid) paid.paidCents += invoice.totalCents;
  }
  return [...months.values()];
}

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
