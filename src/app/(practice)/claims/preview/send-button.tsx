"use client";

import { useActionState } from "react";
import { sendClaims } from "../actions";
import { button } from "@/app/ui";

/** Sends the previewed claim batches. Disabled while sending, so a double tap can't send twice. */
export function SendButton({ invoiceIds, batches }: { invoiceIds: string[]; batches: number }) {
  const [state, action, sending] = useActionState(sendClaims.bind(null, invoiceIds), {});
  return (
    <form action={action} className="flex flex-col gap-2">
      <button type="submit" disabled={sending} className={`${button} w-full py-3`}>
        {sending ? "Sending…" : batches === 1 ? "Send 1 email" : `Send ${batches} emails`}
      </button>
      {state.error && <p role="alert" className="text-sm text-red-600">{state.error}</p>}
    </form>
  );
}
