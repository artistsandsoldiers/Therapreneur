"use client";

import { useTransition } from "react";
import { deleteInvoice } from "../../sessions/actions";
import { secondaryButton } from "@/app/ui";

export function DeleteButton({ invoiceId }: { invoiceId: string }) {
  const [deleting, startDeleting] = useTransition();
  return (
    <button
      type="button"
      disabled={deleting}
      onClick={() => {
        if (confirm("Delete this invoice and its session? This can't be undone.")) {
          startDeleting(() => deleteInvoice(invoiceId));
        }
      }}
      className={`${secondaryButton} text-red-600`}
    >
      {deleting ? "Deleting…" : "Delete"}
    </button>
  );
}
