import type { Metadata } from "next";
import { narrow } from "@/app/ui";
import Link from "next/link";
import { NewSession } from "../new-session";

export const metadata: Metadata = { title: "New session · Therapreneur" };

// New session usually opens as a pop-up; this page is for links and refreshes.
export default async function NewSessionPage({ searchParams }: { searchParams: Promise<{ patient?: string }> }) {
  const { patient } = await searchParams;

  return (
    <main className={`py-6 ${narrow}`}>
      <Link href={patient ? `/patients/${patient}` : "/invoices"} className="text-sm text-neutral-500">
        ← {patient ? "Patient" : "Invoices"}
      </Link>
      <h1 className="mt-3 mb-6 text-2xl font-semibold tracking-tight">New session</h1>
      <NewSession patientId={patient} />
    </main>
  );
}
