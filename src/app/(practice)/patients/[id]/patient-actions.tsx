"use client";

import { useState, useTransition } from "react";
import { deletePatient, setPastPatient } from "../actions";
import { secondaryButton } from "@/app/ui";

/** Moving a patient to past patients and back, and deleting one with no sessions. */
export function PatientActions({ patientId, isPast, canDelete }: { patientId: string; isPast: boolean; canDelete: boolean }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <section className="mt-12 border-t border-neutral-100 pt-6">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={pending}
          onClick={() => startTransition(() => setPastPatient(patientId, !isPast))}
          className={secondaryButton}
        >
          {isPast ? "Make current" : "Move to past patients"}
        </button>
        {canDelete && (
          <button
            type="button"
            disabled={pending}
            onClick={() => {
              if (!confirm("Delete this patient? This can't be undone.")) return;
              setError(null);
              startTransition(async () => {
                const result = await deletePatient(patientId);
                if (result?.error) setError(result.error);
              });
            }}
            className={`${secondaryButton} text-red-600`}
          >
            Delete
          </button>
        )}
      </div>
      <p className="mt-2 text-sm text-neutral-500">
        {isPast
          ? "Past patients are hidden from your list and from New session. Their sessions and invoices stay."
          : canDelete
            ? "Moving to past patients hides them from your list and New session, and keeps everything. Delete is only for patients with no sessions, like a typo or duplicate."
            : "Moving to past patients hides them from your list and New session. Their sessions and invoices stay."}
      </p>
      {error && <p role="alert" className="mt-2 text-sm text-red-600">{error}</p>}
    </section>
  );
}
