import type { Metadata } from "next";
import { narrow } from "@/app/ui";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PatientForm } from "../../patient-form";
import { loadMedicalAids } from "@/lib/capture-data";
import { requireSetUpPractice } from "@/lib/practice";

export const metadata: Metadata = { title: "Edit patient · Therapreneur" };

export default async function EditPatientPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase } = await requireSetUpPractice();
  const [{ medicalAids, defaultMedicalAidId }, { data: patient }] = await Promise.all([
    loadMedicalAids(supabase),
    supabase.from("patients").select("*").eq("id", id).maybeSingle(),
  ]);
  if (!patient) notFound();

  return (
    <main className={`py-6 ${narrow}`}>
      <Link href={`/patients/${patient.id}`} className="text-sm text-neutral-500">← {patient.first_name} {patient.last_name}</Link>
      <h1 className="mt-3 mb-2 text-2xl font-semibold tracking-tight">Edit patient</h1>
      <p className="mb-6 text-sm text-neutral-500">Changes also show on this patient&apos;s existing invoices.</p>
      <PatientForm medicalAids={medicalAids} defaultMedicalAidId={defaultMedicalAidId} patient={patient} />
    </main>
  );
}
