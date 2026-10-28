import type { Metadata } from "next";
import Link from "next/link";
import { PatientList } from "./patient-list";
import { button } from "@/app/ui";
import { formatDate, toLocalInput } from "@/lib/dates";
import { payerLabel } from "@/lib/patients";
import { requireSetUpPractice } from "@/lib/practice";
import { loadMedicalAids } from "@/lib/capture-data";
import { ModalButton } from "../modal";
import { PatientForm } from "./patient-form";

export const metadata: Metadata = { title: "Patients · Therapreneur" };

export default async function PatientsPage({ searchParams }: { searchParams: Promise<{ show?: string }> }) {
  const showPast = (await searchParams).show === "past";
  const { supabase } = await requireSetUpPractice();
  const { medicalAids, defaultMedicalAidId } = await loadMedicalAids(supabase);
  let query = supabase
    .from("patients")
    .select("id, first_name, last_name, bill_to, medical_aids(name), sessions(starts_at)")
    .order("last_name")
    .order("first_name");
  query = showPast ? query.not("past_since", "is", null) : query.is("past_since", null);
  const { data: patients, error } = await query;
  if (error) throw error;

  const rows = patients.map((patient) => {
    const last = patient.sessions.map((s) => s.starts_at).sort().at(-1);
    return {
      id: patient.id,
      name: `${patient.first_name} ${patient.last_name}`,
      payer: payerLabel(patient.medical_aids?.name ?? null, patient.bill_to),
      lastSession: last ? formatDate(toLocalInput(new Date(last))) : null,
    };
  });

  const tab = (active: boolean) =>
    `rounded-md px-3 py-1.5 text-sm font-medium ${active ? "bg-white shadow-sm" : "text-neutral-500"}`;

  return (
    <main className="py-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">Patients</h1>
        <ModalButton label="Add patient" title="Add patient" className={button}>
          <PatientForm medicalAids={medicalAids} defaultMedicalAidId={defaultMedicalAidId} />
        </ModalButton>
      </div>
      <div className="mt-6 inline-flex gap-1 rounded-lg bg-neutral-100 p-1">
        <Link href="/patients" className={tab(!showPast)} aria-current={!showPast ? "page" : undefined}>Current</Link>
        <Link href="/patients?show=past" className={tab(showPast)} aria-current={showPast ? "page" : undefined}>Past</Link>
      </div>
      <PatientList
        patients={rows}
        empty={
          showPast
            ? "No past patients. When you stop seeing someone, open their page and move them here."
            : "No patients yet. Add one here, or while capturing a session."
        }
      />
    </main>
  );
}
