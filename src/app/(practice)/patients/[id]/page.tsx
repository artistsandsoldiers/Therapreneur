import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PatientActions } from "./patient-actions";
import { button, secondaryButton } from "@/app/ui";
import { formatDate, friendlyDate, friendlySessionTime } from "@/lib/dates";
import { invoiceNumber } from "@/lib/invoices";
import { formatRands } from "@/lib/money";
import { requireSetUpPractice } from "@/lib/practice";
import { ModalButton } from "../../modal";
import { NewSession } from "../../sessions/new-session";
import { invoiceTotal } from "@/lib/pricing";
import { referrerKindLabel } from "@/lib/referrers";

export const metadata: Metadata = { title: "Patient · Therapreneur" };

export default async function PatientPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase } = await requireSetUpPractice();
  const { data: patient } = await supabase
    .from("patients")
    .select(
      "*, medical_aids(name), referrers(name, kind, practice_number), sessions(id, starts_at, duration_minutes, outcome, note, invoices(id, number, invoice_lines(code, quantity, unit_price_cents, position)))",
    )
    .eq("id", id)
    .maybeSingle();
  if (!patient) notFound();

  const name = `${patient.first_name} ${patient.last_name}`;
  const sessions = [...patient.sessions].sort((a, b) => b.starts_at.localeCompare(a.starts_at));
  const isMainMember = patient.main_member_name === name;

  return (
    <main className="py-6">
      <Link href={patient.past_since ? "/patients?show=past" : "/patients"} className="text-sm text-neutral-500">← Patients</Link>

      <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{name}</h1>
          {patient.past_since && (
            <p className="mt-1 text-sm text-neutral-500">Past patient since {friendlyDate(patient.past_since)}</p>
          )}
        </div>
        <div className="flex gap-2">
          <Link href={`/patients/${patient.id}/edit`} className={secondaryButton}>Edit</Link>
          {!patient.past_since && (
            <ModalButton label="New session" title="New session" className={button}>
              <NewSession patientId={patient.id} />
            </ModalButton>
          )}
        </div>
      </div>

      {/* Details beside the sessions on a wide screen, above them on a phone. */}
      <div className="lg:grid lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)] lg:items-start lg:gap-10">
        <dl className="mt-6 grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 border-y border-neutral-100 py-4 text-sm">
          <dt className="text-neutral-500">Who pays</dt>
          <dd>{patient.bill_to === "patient" ? "The patient" : "Medical aid"}</dd>
          {!patient.medical_aids ? (
            <>
              <dt className="text-neutral-500">Medical aid</dt>
              <dd>None</dd>
            </>
          ) : (
            <>
              <dt className="text-neutral-500">Medical aid</dt>
              <dd>{patient.medical_aids?.name}{patient.plan && ` · ${patient.plan}`}</dd>
              <dt className="text-neutral-500">Member no.</dt>
              <dd>
                {patient.member_number}
                {patient.dependant_code && ` · Dependant ${patient.dependant_code}`}
              </dd>
              <dt className="text-neutral-500">Main member</dt>
              <dd>{isMainMember ? "The patient" : patient.main_member_name}</dd>
            </>
          )}
          {patient.referrers && (
            <>
              <dt className="text-neutral-500">Referred by</dt>
              <dd>
                {patient.referrers.name}
                <span className="text-neutral-500">
                  {" · "}
                  {patient.referrers.practice_number
                    ? `Practice no. ${patient.referrers.practice_number}`
                    : referrerKindLabel(patient.referrers.kind)}
                </span>
              </dd>
            </>
          )}
          <dt className="text-neutral-500">Date of birth</dt>
          <dd>{patient.date_of_birth ? formatDate(patient.date_of_birth) : "Not added yet"}</dd>
          <dt className="text-neutral-500">ICD-10</dt>
          <dd>{patient.icd10_codes.length ? patient.icd10_codes.join(", ") : "None yet"}</dd>
        </dl>

        <section>
          <h2 className="mt-10 mb-3 text-lg font-semibold lg:mt-6">Sessions</h2>
          {sessions.length === 0 ? (
            <p className="text-neutral-500">No sessions yet.</p>
          ) : (
            <ol className="flex flex-col gap-3">
              {sessions.map((session) => {
                const invoice = session.invoices;
                const lines = [...(invoice?.invoice_lines ?? [])].sort((a, b) => a.position - b.position);
                const total = invoiceTotal(lines.map((line) => ({ quantity: line.quantity, unitPriceCents: line.unit_price_cents })));
                return (
                  <li key={session.id} className="rounded-lg border border-neutral-200 p-4">
                    <div className="flex items-baseline justify-between gap-3">
                      <p className="font-medium">
                        {friendlySessionTime(session.starts_at, session.duration_minutes)}
                        {session.outcome === "no_show" && <span className="ml-2 text-sm font-normal text-neutral-500">No-show</span>}
                      </p>
                      {invoice && (
                        <Link href={`/invoices/${invoice.id}`} className="shrink-0 text-sm text-neutral-500 underline-offset-2 hover:underline">
                          {invoiceNumber(invoice.number)} · {formatRands(total)}
                        </Link>
                      )}
                    </div>
                    {session.outcome === "attended" && lines.length > 0 && (
                      <p className="mt-1 text-sm text-neutral-500">
                        {lines.map((line) => (line.quantity > 1 ? `${line.code} ×${line.quantity}` : line.code)).join(", ")}
                      </p>
                    )}
                    {session.note ? (
                      <p className="mt-3 whitespace-pre-wrap">{session.note}</p>
                    ) : (
                      <p className="mt-3 text-neutral-400">No note yet</p>
                    )}
                    <Link href={`/sessions/${session.id}/edit`} className="mt-3 inline-block text-sm font-medium text-accent">
                      {session.note ? "Edit" : "Add note"}
                    </Link>
                  </li>
                );
              })}
            </ol>
          )}
        </section>
      </div>

      <PatientActions patientId={patient.id} isPast={Boolean(patient.past_since)} canDelete={sessions.length === 0} />
    </main>
  );
}
