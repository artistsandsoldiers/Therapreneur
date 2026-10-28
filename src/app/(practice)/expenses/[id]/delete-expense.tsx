"use client";

import { useState, useTransition } from "react";
import { deleteExpense } from "../actions";
import { secondaryButton } from "@/app/ui";

/** Deletes an expense and its receipt, after checking. */
export function DeleteExpense({ expenseId }: { expenseId: string }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <section className="mt-12 border-t border-neutral-100 pt-6">
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          if (!confirm("Delete this expense and its receipt? This can't be undone.")) return;
          setError(null);
          startTransition(async () => {
            const result = await deleteExpense(expenseId);
            if (result?.error) setError(result.error);
          });
        }}
        className={`${secondaryButton} text-red-600`}
      >
        {pending ? "Deleting…" : "Delete expense"}
      </button>
      {error && <p role="alert" className="mt-2 text-sm text-red-600">{error}</p>}
    </section>
  );
}
