"use client";

import { useActionState, useState } from "react";
import { joinWaitlist, type WaitlistState } from "./actions";
import { OCCUPATIONS } from "@/lib/waitlist";
import { field } from "./ui";

export function WaitlistForm({ source }: { source: string | null }) {
  const [state, action, pending] = useActionState<WaitlistState, FormData>(
    joinWaitlist,
    { status: "idle" },
  );
  const [occupation, setOccupation] = useState("");

  if (state.status === "joined") {
    return (
      <div className="rounded-lg border border-neutral-200 p-6">
        <p className="font-medium">You&apos;re on the list.</p>
        <p className="mt-1 text-neutral-500">
          We&apos;ll be in touch as soon as there&apos;s something to try.
        </p>
      </div>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-3">
      <label className="sr-only" htmlFor="name">Name</label>
      <input id="name" name="name" required autoComplete="name" placeholder="Your name" className={field} />

      <label className="sr-only" htmlFor="email">Email</label>
      <input id="email" name="email" type="email" required autoComplete="email" placeholder="Email address" className={field} />

      <label className="sr-only" htmlFor="occupation">Occupation</label>
      <select
        id="occupation"
        name="occupation"
        required
        value={occupation}
        onChange={(event) => setOccupation(event.target.value)}
        className={`${field} text-neutral-900 invalid:text-neutral-400`}>
        <option value="" disabled>Your occupation</option>
        {OCCUPATIONS.map((occupation) => (
          <option key={occupation} value={occupation}>{occupation}</option>
        ))}
      </select>

      {occupation === "Other" && (
        <>
          <label className="sr-only" htmlFor="otherOccupation">Your occupation</label>
          <input
            id="otherOccupation"
            name="otherOccupation"
            required
            maxLength={100}
            autoFocus
            placeholder="What do you do?"
            className={field}
          />
        </>
      )}

      <input type="hidden" name="source" value={source ?? ""} />
      <div aria-hidden className="hidden">
        <input name="company" tabIndex={-1} autoComplete="off" />
      </div>

      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-accent px-4 py-2.5 font-medium text-white transition-colors hover:bg-accent-hover disabled:opacity-60"
      >
        {pending ? "Joining…" : "Join the waiting list"}
      </button>

      {state.status === "error" && (
        <p role="alert" className="text-sm text-red-600">{state.message}</p>
      )}
      <p className="text-xs text-neutral-400">
        We&apos;ll only use your details to contact you about Therapreneur. Unsubscribe any time.
      </p>
    </form>
  );
}
