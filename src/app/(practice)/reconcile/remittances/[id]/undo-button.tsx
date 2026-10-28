"use client";

import { useState, useTransition } from "react";
import { undoRemittance } from "../../actions";
import { secondaryButton } from "@/app/ui";

/** Undoes a remittance recorded by mistake, so its claims are outstanding again. */
export function UndoButton({ remittanceId }: { remittanceId: string }) {
  const [undoing, startUndoing] = useTransition();
  const [error, setError] = useState<string>();
  return (
    <>
      <button
        type="button"
        disabled={undoing}
        onClick={() => {
          if (confirm("Undo this remittance? Its claims will be outstanding again.")) {
            startUndoing(async () => setError((await undoRemittance(remittanceId))?.error));
          }
        }}
        className={`${secondaryButton} text-red-600`}
      >
        {undoing ? "Undoing…" : "Undo remittance"}
      </button>
      {error && <p role="alert" className="mt-2 text-sm text-red-600">{error}</p>}
    </>
  );
}
