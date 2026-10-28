"use client";

import { useActionState } from "react";
import { saveLogo, type LogoState } from "./actions";
import { button, secondaryButton } from "@/app/ui";

/** Uploads, replaces or removes the practice's logo. */
export function LogoForm({ logoUrl }: { logoUrl: string | null }) {
  const [state, action, saving] = useActionState<LogoState, FormData>(saveLogo, {});

  return (
    <section className="mb-10">
      <h2 className="mb-1 text-lg font-semibold">Logo</h2>
      <p className="mb-4 text-sm text-neutral-500">Shown in your menu and on your invoices and claims. A PNG or JPG under 1 MB.</p>
      {logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- a short-lived private link, which Next's image optimiser can't cache
        <img src={logoUrl} alt="Your logo" className="mb-4 max-h-16 max-w-48 object-contain" />
      ) : (
        <p className="mb-4 text-sm text-neutral-500">No logo yet, so your practice name is shown instead.</p>
      )}
      <form action={action} className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <input
          name="logo"
          type="file"
          accept="image/png,image/jpeg"
          required
          className="text-sm file:mr-3 file:rounded-md file:border file:border-neutral-200 file:bg-white file:px-3 file:py-2 file:font-medium"
        />
        <button type="submit" disabled={saving} className={`${button} shrink-0`}>
          {saving ? "Uploading…" : logoUrl ? "Replace" : "Upload"}
        </button>
      </form>
      {logoUrl && (
        <form action={action} className="mt-3">
          <input type="hidden" name="remove" value="yes" />
          <button type="submit" disabled={saving} className={secondaryButton}>Remove logo</button>
        </form>
      )}
      {state.error && <p role="alert" className="mt-2 text-sm text-red-600">{state.error}</p>}
    </section>
  );
}
