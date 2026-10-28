"use client";

import { startTransition, useActionState } from "react";
import { savePatient } from "./actions";
import { PatientFields } from "./patient-fields";
import { button } from "@/app/ui";
import type { MedicalAid, Patient } from "@/lib/capture-data";

/** Add or edit a patient on their own page. */
export function PatientForm(props: { medicalAids: MedicalAid[]; defaultMedicalAidId: string; patient?: Patient }) {
  const [state, action, saving] = useActionState(savePatient.bind(null, props.patient?.id ?? null), {});

  return (
    <form
      // Submitting by hand keeps what she typed if there's an error; a form action would clear the fields.
      onSubmit={(event) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        startTransition(() => action(form));
      }}
      className="flex flex-col gap-3"
    >
      <PatientFields {...props} />
      <button type="submit" disabled={saving} className={`${button} mt-3`}>
        {saving ? "Saving…" : props.patient ? "Save changes" : "Add patient"}
      </button>
      {state.error && <p role="alert" className="text-sm text-red-600">{state.error}</p>}
    </form>
  );
}
