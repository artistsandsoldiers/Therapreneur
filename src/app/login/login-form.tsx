"use client";

import { useActionState } from "react";
import { sendCode, verifyCode, type LoginState } from "./actions";
import { button, field } from "@/app/ui";

export function LoginForm() {
  const [sent, send, sending] = useActionState<LoginState, FormData>(sendCode, { step: "email" });
  const [checked, verify, verifying] = useActionState<LoginState, FormData>(verifyCode, { step: "code" });

  if (sent.step === "code") {
    return (
      <div className="flex flex-col gap-3">
      <form action={verify} className="flex flex-col gap-3">
        <p className="text-neutral-600">
          We emailed a code to <span className="font-medium text-neutral-900">{sent.email}</span>.
        </p>
        <input type="hidden" name="email" value={sent.email} />
        <label className="sr-only" htmlFor="code">Code</label>
        <input
          id="code"
          name="code"
          required
          autoFocus
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9 ]{6,10}"
          placeholder="6-digit code"
          className={`${field} text-center text-lg tracking-[0.3em]`}
        />
        <button type="submit" disabled={verifying} className={button}>
          {verifying ? "Checking…" : "Log in"}
        </button>
        {checked.error && <p role="alert" className="text-sm text-red-600">{checked.error}</p>}
      </form>
      <form action={send}>
        <input type="hidden" name="email" value={sent.email} />
        <button type="submit" disabled={sending} className="text-sm text-neutral-500 underline">
          {sending ? "Sending…" : "Send a new code"}
        </button>
      </form>
      </div>
    );
  }

  return (
    <form action={send} className="flex flex-col gap-3">
      <label className="sr-only" htmlFor="email">Email</label>
      <input
        id="email"
        name="email"
        type="email"
        required
        autoFocus
        autoComplete="email"
        defaultValue={sent.email}
        placeholder="Email address"
        className={field}
      />
      <button type="submit" disabled={sending} className={button}>
        {sending ? "Sending…" : "Email me a code"}
      </button>
      {sent.error && <p role="alert" className="text-sm text-red-600">{sent.error}</p>}
    </form>
  );
}
