import { formatDate } from "./dates";
import type { InvoiceDocument } from "./invoice-document";
import { invoiceNumber } from "./invoices";
import { formatRands } from "./money";
import type { Practice } from "./practice";

/**
 * Where claim emails go, from the server's settings. While testing (decision 0007) every claim goes to one test
 * inbox, and with no test inbox set, sending refuses rather than risk reaching a real medical aid.
 */
export type ClaimSending = { apiKey: string; to: string; from: string };

export function claimSending(env: Record<string, string | undefined>): { ok: true; sending: ClaimSending } | { ok: false; error: string } {
  const apiKey = env.RESEND_API_KEY?.trim();
  const to = env.CLAIMS_TEST_INBOX?.trim();
  if (!apiKey || !to) {
    return { ok: false, error: "Claim emails aren't switched on yet, so nothing was sent." };
  }
  // Resend's shared test address works without verifying a domain, but only sends to the Resend account's owner.
  return { ok: true, sending: { apiKey, to, from: env.CLAIMS_FROM_EMAIL?.trim() || "onboarding@resend.dev" } };
}

/** What stops a practice sending claims at all, in plain words. Medical aids need both numbers on every claim. */
export function missingPracticeDetails(practice: Pick<Practice, "practice_number" | "hpcsa_number">): string[] {
  const missing: string[] = [];
  if (!practice.practice_number) missing.push("practice number");
  if (!practice.hpcsa_number) missing.push("HPCSA registration number");
  return missing;
}

/** Splits invoices into one claim batch per medical aid, in the order they first appear. */
export function groupByMedicalAid<T extends { medicalAidId: string | null }>(invoices: T[]): Map<string, T[]> {
  const groups = new Map<string, T[]>();
  for (const invoice of invoices) {
    if (!invoice.medicalAidId) continue;
    groups.set(invoice.medicalAidId, [...(groups.get(invoice.medicalAidId) ?? []), invoice]);
  }
  return groups;
}

export type ClaimEmail = { subject: string; html: string; text: string };

/** The claim batch email to a medical aid: a short note and a table of the claims, with each invoice attached as a PDF. */
export function claimEmail(practice: Practice, medicalAidName: string, invoices: InvoiceDocument[], testInbox: string): ClaimEmail {
  const total = invoices.reduce((sum, invoice) => sum + invoice.totalCents, 0);
  const count = invoices.length === 1 ? "1 claim" : `${invoices.length} claims`;
  const subject = `Claims from ${practice.name} (practice no. ${practice.practice_number}): ${count}`;

  const columns = ["Invoice", "Patient", "Date of birth", "Member no.", "Dependant", "Date of service", "ICD-10", "Amount"];
  const rows = invoices.map((invoice) => [
    invoiceNumber(invoice.number),
    invoice.patient.patient_name,
    invoice.patient.date_of_birth ? formatDate(invoice.patient.date_of_birth) : "",
    invoice.patient.member_number ?? "",
    invoice.patient.dependant_code ?? "",
    formatDate(invoice.issuedOn),
    [...new Set(invoice.lines.flatMap((line) => line.icd10Codes))].join(", "),
    formatRands(invoice.totalCents),
  ]);

  const intro = `Please find attached ${count} from ${practice.name}, totalling ${formatRands(total)}. Kindly reply with a reference number.`;
  const testNote = `Test only: in real use this would go to ${medicalAidName}. It went to ${testInbox} instead.`;
  const signOff = [
    practice.name,
    `Practice no. ${practice.practice_number} · HPCSA no. ${practice.hpcsa_number}`,
    practice.phone,
    practice.email,
  ].filter(Boolean) as string[];

  const cell = "padding:6px 10px;border-bottom:1px solid #e5e5e5;text-align:left;";
  const html = `<div style="font-family:Helvetica,Arial,sans-serif;font-size:14px;color:#171717;">
<p style="background:#fef3c7;padding:8px 12px;border-radius:6px;">${escape(testNote)}</p>
<p>Dear ${escape(medicalAidName)} claims team,</p>
<p>${escape(intro)}</p>
<table style="border-collapse:collapse;font-size:13px;">
<thead><tr>${columns.map((c) => `<th style="${cell}color:#737373;font-weight:500;">${c}</th>`).join("")}</tr></thead>
<tbody>${rows.map((row) => `<tr>${row.map((value) => `<td style="${cell}">${escape(value)}</td>`).join("")}</tr>`).join("")}</tbody>
</table>
<p>Kind regards<br>${signOff.map(escape).join("<br>")}</p>
</div>`;

  const text = [
    testNote,
    "",
    `Dear ${medicalAidName} claims team,`,
    "",
    intro,
    "",
    ...rows.map((row) => row.map((value, i) => `${columns[i]}: ${value}`).join(" | ")),
    "",
    "Kind regards",
    ...signOff,
  ].join("\n");

  return { subject, html, text };
}

function escape(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
