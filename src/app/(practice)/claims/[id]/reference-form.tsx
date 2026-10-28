"use client";

import { useActionState } from "react";
import { saveReferenceNumber } from "../actions";
import { button, field, label } from "@/app/ui";

/** Records the reference number the medical aid replied with. */
export function ReferenceForm({ batchId, referenceNumber }: { batchId: string; referenceNumber: string | null }) {
  const [state, action, saving] = useActionState(saveReferenceNumber.bind(null, batchId), {});
  return (
    <form action={action} className="flex flex-col gap-2">
      <label htmlFor="reference_number" className={label}>Reference number</label>
      <div className="flex gap-2">
        <input
          id="reference_number"
          name="reference_number"
          defaultValue={referenceNumber ?? ""}
          placeholder="From the medical aid's reply"
          autoComplete="off"
          className={field}
        />
        <button type="submit" disabled={saving} className={`${button} shrink-0`}>
          {saving ? "Saving…" : "Save"}
        </button>
      </div>
      {state.error && <p role="alert" className="text-sm text-red-600">{state.error}</p>}
    </form>
  );
}
