"use client";

import { useActionState, useRef } from "react";
import { saveLogo, type LogoState } from "./actions";

/** The practice's logo, with a pencil to upload or replace it and a link to remove it. */
export function LogoForm({ logoUrl, practiceName }: { logoUrl: string | null; practiceName: string }) {
  const [state, action, saving] = useActionState<LogoState, FormData>(saveLogo, {});
  const upload = useRef<HTMLFormElement>(null);
  const file = useRef<HTMLInputElement>(null);

  return (
    <section className="mb-10">
      <div className="flex items-center gap-5">
        <div className="relative">
          <div className="flex h-20 w-32 items-center justify-center rounded-lg border border-neutral-200 bg-white p-2">
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- a short-lived private link, which Next's image optimiser can't cache
              <img src={logoUrl} alt="Your logo" className="max-h-full max-w-full object-contain" />
            ) : (
              <span className="text-center text-xs text-neutral-400">No logo</span>
            )}
          </div>
          <button
            type="button"
            onClick={() => file.current?.click()}
            disabled={saving}
            aria-label={logoUrl ? "Change logo" : "Add logo"}
            title={logoUrl ? "Change logo" : "Add logo"}
            className="absolute -right-2 -bottom-2 flex size-8 items-center justify-center rounded-full border border-neutral-200 bg-white text-neutral-600 shadow-sm transition-colors hover:text-accent disabled:opacity-60"
          >
            <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" className="size-4" aria-hidden>
              <path d="M13.6 3.4a1.9 1.9 0 0 1 2.7 2.7L7 15.4l-3.5.8.8-3.5 9.3-9.3Z" strokeLinejoin="round" />
              <path d="m12.2 4.8 2.7 2.7" />
            </svg>
          </button>
        </div>
        <div className="min-w-0">
          <p className="truncate text-lg font-semibold">{practiceName}</p>
          <p className="text-sm text-neutral-500">
            {saving ? "Saving…" : "Your logo shows in the menu and on invoices and claims. PNG or JPG, under 1 MB."}
          </p>
          {logoUrl && !saving && (
            <form action={action}>
              <input type="hidden" name="remove" value="yes" />
              <button type="submit" className="mt-1 text-sm text-neutral-500 underline-offset-2 hover:underline">
                Remove logo
              </button>
            </form>
          )}
        </div>
      </div>
      {/* Picking a file uploads it straight away. */}
      <form ref={upload} action={action} className="hidden">
        <input
          ref={file}
          name="logo"
          type="file"
          accept="image/png,image/jpeg"
          onChange={(event) => event.target.files?.length && upload.current?.requestSubmit()}
        />
      </form>
      {state.error && <p role="alert" className="mt-3 text-sm text-red-600">{state.error}</p>}
    </section>
  );
}
