"use client";

import { useActionState } from "react";
import { saveSetup, type SetupState } from "./actions";
import { PricingField } from "./pricing-field";
import type { PriceExample } from "@/lib/capture-data";
import { button, field, label } from "@/app/ui";
import { BUSINESS_TYPES, PROFESSIONS } from "@/lib/setup";
import type { Practice } from "@/lib/practice";

export function SetupForm({ practice, priceExample }: { practice: Practice; priceExample: PriceExample | null }) {
  const [state, action, pending] = useActionState<SetupState, FormData>(saveSetup, {});
  const isFirstTime = !practice.setup_completed_at;

  return (
    <form action={action} className="flex flex-col gap-8">
      <fieldset className="flex flex-col gap-4">
        <legend className="mb-3 text-lg font-semibold">Your practice</legend>
        <Field name="name" label="Practice name" initial={practice.name} required autoComplete="organization" />
        <Field name="practice_number" label="Practice number (optional, needed for claims)" initial={practice.practice_number} />
        <Field name="hpcsa_number" label="HPCSA registration number (optional, needed for claims)" initial={practice.hpcsa_number} />
        <div>
          <label htmlFor="address" className={label}>Address</label>
          <textarea id="address" name="address" required rows={3} defaultValue={practice.address ?? ""} className={field} />
        </div>
        <Field name="phone" label="Phone (optional)" initial={practice.phone} type="tel" autoComplete="tel" />
        <Field name="email" label="Email for invoices (optional)" initial={practice.email ?? practice.invite_email} type="email" />
        <div>
          <label htmlFor="profession" className={label}>Profession</label>
          <select id="profession" name="profession" required defaultValue={practice.profession ?? ""} className={field}>
            <option value="" disabled>Choose…</option>
            {PROFESSIONS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
          </select>
        </div>
        <div>
          <span className={label}>How your practice is set up</span>
          <div className="flex flex-col gap-2">
            {BUSINESS_TYPES.map((type) => (
              <label key={type.value} className="flex items-start gap-3 rounded-md border border-neutral-200 px-3 py-2.5 has-checked:border-accent">
                <input
                  type="radio"
                  name="business_type"
                  value={type.value}
                  defaultChecked={practice.business_type === type.value}
                  className="mt-1 accent-accent"
                />
                <span>
                  {type.label}
                  <span className="block text-sm text-neutral-500">{type.hint}</span>
                </span>
              </label>
            ))}
          </div>
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-4">
        <legend className="mb-1 text-lg font-semibold">Banking details</legend>
        <p className="text-sm text-neutral-500">Printed on your invoices so patients can pay you.</p>
        <Field name="bank_name" label="Bank" initial={practice.bank_name} required />
        <Field name="bank_account_holder" label="Account holder" initial={practice.bank_account_holder} required />
        <Field name="bank_account_number" label="Account number" initial={practice.bank_account_number} required inputMode="numeric" />
        <Field name="bank_branch_code" label="Branch code" initial={practice.bank_branch_code} required inputMode="numeric" />
      </fieldset>

      <fieldset className="flex flex-col gap-4">
        <legend className="mb-1 text-lg font-semibold">Pricing</legend>
        <p className="text-sm text-neutral-500">
          We keep every billing code and medical aid rate up to date for you. Slide to set how your prices compare.
        </p>
        <PricingField initial={practice.price_adjustment_percent} example={priceExample} />
        <div>
          <label htmlFor="no_show_price" className={label}>No-show price (R)</label>
          <input
            id="no_show_price"
            name="no_show_price"
            required
            inputMode="decimal"
            defaultValue={practice.no_show_price_cents === null ? "" : (practice.no_show_price_cents / 100).toFixed(2)}
            placeholder="350.00"
            className={field}
          />
          <p className="mt-1 text-sm text-neutral-500">Billed to the patient when they don&apos;t arrive.</p>
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-4">
        <legend className="mb-1 text-lg font-semibold">Sessions</legend>
        <div>
          <label htmlFor="session_minutes" className={label}>Usual session length (minutes)</label>
          <input
            id="session_minutes"
            name="session_minutes"
            required
            inputMode="numeric"
            pattern="[0-9]{1,3}"
            defaultValue={practice.session_minutes}
            className={field}
          />
          <p className="mt-1 text-sm text-neutral-500">New sessions start at this length. You can change it for any session.</p>
        </div>
      </fieldset>

      <div className="flex flex-col gap-3">
        <button type="submit" disabled={pending} className={button}>
          {pending ? "Saving…" : isFirstTime ? "Finish setup" : "Save"}
        </button>
        {state.error && <p role="alert" className="text-sm text-red-600">{state.error}</p>}
      </div>
    </form>
  );
}

function Field({
  name,
  label: text,
  initial,
  ...props
}: { name: string; label: string; initial: string | null } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      <label htmlFor={name} className={label}>{text}</label>
      <input id={name} name={name} defaultValue={initial ?? ""} className={field} {...props} />
    </div>
  );
}
