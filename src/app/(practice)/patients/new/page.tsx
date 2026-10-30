import type { Metadata } from "next";
import { narrow } from "@/app/ui";
import Link from "next/link";
import { PatientForm } from "../patient-form";
import { loadPatientFormData } from "@/lib/capture-data";
import { requireSetUpPractice } from "@/lib/practice";

export const metadata: Metadata = { title: "Add patient · Therapreneur" };

export default async function NewPatientPage() {
  const { supabase } = await requireSetUpPractice();
  const { medicalAids, defaultMedicalAidId, referrers, places } = await loadPatientFormData(supabase);

  return (
    <main className={`py-6 ${narrow}`}>
      <Link href="/patients" className="text-sm text-neutral-500">← Patients</Link>
      <h1 className="mt-3 mb-6 text-2xl font-semibold tracking-tight">Add patient</h1>
      <PatientForm medicalAids={medicalAids} defaultMedicalAidId={defaultMedicalAidId} referrers={referrers} places={places} />
    </main>
  );
}
