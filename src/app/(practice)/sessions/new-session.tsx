import { cache } from "react";
import { CaptureForm } from "./capture-form";
import { loadCaptureData } from "@/lib/capture-data";
import { toLocalInput } from "@/lib/dates";
import { requireSetUpPractice } from "@/lib/practice";

// Read once per request, though a page may show the pop-up's button in two places.
const load = cache(async () => {
  const { supabase, practice } = await requireSetUpPractice();
  return { practice, data: await loadCaptureData(supabase, practice) };
});

/** The capture form for a new session, on its own page or in a pop-up. */
export async function NewSession({ patientId }: { patientId?: string }) {
  const { practice, data } = await load();
  // Started from a patient's page, so that patient is already picked.
  const picked = data.patients.find((p) => p.id === patientId && !p.past_since)?.id ?? "";

  return (
    <CaptureForm
      {...data}
      adjustmentPercent={practice.price_adjustment_percent}
      noShowPriceCents={practice.no_show_price_cents ?? 0}
      initial={{
        sessionId: null,
        patientId: picked,
        startsAt: toLocalInput(new Date()),
        durationMinutes: practice.session_minutes,
        outcome: "attended",
        billTo: null,
        note: "",
        lines: [],
      }}
    />
  );
}
