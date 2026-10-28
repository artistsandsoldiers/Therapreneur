import type { Metadata } from "next";
import { CalendarView } from "./calendar-view";
import { loadPatientFormData } from "@/lib/capture-data";
import { requireSetUpPractice } from "@/lib/practice";

export const metadata: Metadata = { title: "Calendar · Therapreneur" };

export default async function CalendarPage() {
  const { supabase, practice } = await requireSetUpPractice();
  const [formData, patients] = await Promise.all([
    loadPatientFormData(supabase),
    supabase.from("patients").select("*").is("past_since", null).order("first_name").order("last_name"),
  ]);
  if (patients.error) throw patients.error;

  return (
    <main className="py-6">
      <CalendarView {...formData} patients={patients.data} sessionMinutes={practice.session_minutes} />
    </main>
  );
}
