import type { Metadata } from "next";
import { narrow } from "@/app/ui";
import { CategoriesForm } from "./categories-form";
import { LogoForm } from "./logo-form";
import { SetupForm } from "@/app/setup/setup-form";
import { logoUrl } from "@/lib/logo";
import { requireSetUpPractice } from "@/lib/practice";

export const metadata: Metadata = { title: "Settings · Therapreneur" };

export default async function SettingsPage() {
  const { supabase, practice } = await requireSetUpPractice();
  const { data: ownCategories, error } = await supabase
    .from("expense_categories")
    .select("id, name")
    .not("practice_id", "is", null)
    .order("name");
  if (error) throw error;

  return (
    <main className={`py-6 ${narrow}`}>
      <h1 className="mb-8 text-2xl font-semibold tracking-tight">Practice settings</h1>
      <LogoForm logoUrl={await logoUrl(supabase, practice)} />
      <SetupForm practice={practice} />
      <CategoriesForm categories={ownCategories} />
    </main>
  );
}
