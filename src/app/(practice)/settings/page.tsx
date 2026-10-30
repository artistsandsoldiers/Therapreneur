import type { Metadata } from "next";
import { narrow } from "@/app/ui";
import { CarSection, type CarWithReadings } from "./car-section";
import { CategoriesForm } from "./categories-form";
import { LogoForm } from "./logo-form";
import { PlacesForm } from "./places-form";
import { SetupForm } from "@/app/setup/setup-form";
import { loadPriceExample } from "@/lib/capture-data";
import { toLocalInput } from "@/lib/dates";
import { logoUrl } from "@/lib/logo";
import { requireSetUpPractice } from "@/lib/practice";
import { loadPlaces } from "@/lib/travel";

export const metadata: Metadata = { title: "Settings · Therapreneur" };

export default async function SettingsPage() {
  const { supabase, practice } = await requireSetUpPractice();
  const [categories, places, cars] = await Promise.all([
    supabase.from("expense_categories").select("id, name").not("practice_id", "is", null).order("name"),
    loadPlaces(supabase),
    supabase
      .from("cars")
      .select("id, name, registration, started_on, ended_on, odometer_readings(id, read_on, km)")
      .order("started_on", { ascending: false }),
  ]);
  if (categories.error) throw categories.error;
  if (cars.error) throw cars.error;
  const carsWithReadings: CarWithReadings[] = cars.data.map(({ odometer_readings, ...car }) => ({
    ...car,
    readings: odometer_readings.map((r) => ({ id: r.id, readOn: r.read_on, km: r.km })),
  }));

  return (
    <main className={`py-6 ${narrow}`}>
      <h1 className="mb-8 text-2xl font-semibold tracking-tight">Practice settings</h1>
      <LogoForm logoUrl={await logoUrl(supabase, practice)} practiceName={practice.name ?? ""} />
      <SetupForm practice={practice} priceExample={await loadPriceExample(supabase, practice)} />
      <PlacesForm places={places} />
      <CarSection cars={carsWithReadings} today={toLocalInput(new Date()).slice(0, 10)} />
      <CategoriesForm categories={categories.data} />
    </main>
  );
}
