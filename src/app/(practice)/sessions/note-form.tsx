"use client";

import { startTransition, useActionState } from "react";
import { saveNote } from "./actions";
import { button, field, label } from "@/app/ui";

/** Edits only the note, for a session whose invoice has been claimed. */
export function NoteForm({ sessionId, note }: { sessionId: string; note: string }) {
  const [state, action, saving] = useActionState(saveNote.bind(null, sessionId), {});

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        startTransition(() => action(form));
      }}
      className="flex flex-col gap-3"
    >
      <label htmlFor="note" className={label}>Note</label>
      <textarea
        id="note"
        name="note"
        rows={8}
        defaultValue={note}
        placeholder="Type, or tap the microphone on your keyboard to dictate"
        className={field}
      />
      <p className="text-sm text-neutral-500">Only you see your notes. They never go on the invoice.</p>
      <button type="submit" disabled={saving} className={`${button} mt-3`}>
        {saving ? "Saving…" : "Save note"}
      </button>
      {state.error && <p role="alert" className="text-sm text-red-600">{state.error}</p>}
    </form>
  );
}
