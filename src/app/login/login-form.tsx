"use client";

import { useActionState, useState } from "react";
import { logIn, setPassword, type LoginState } from "./actions";
import { button, field } from "@/app/ui";

export function LoginForm() {
  const [firstTime, setFirstTime] = useState(false);
  const [loginState, login, loggingIn] = useActionState<LoginState, FormData>(logIn, {});
  const [setState, set, setting] = useActionState<LoginState, FormData>(setPassword, {});
  const error = firstTime ? setState.error : loginState.error;
  const pending = firstTime ? setting : loggingIn;

  return (
    <form action={firstTime ? set : login} className="flex flex-col gap-3">
      <label className="sr-only" htmlFor="email">Email</label>
      <input id="email" name="email" type="email" required autoComplete="email" placeholder="Email address" className={field} />
      <label className="sr-only" htmlFor="password">Password</label>
      <input
        id="password"
        name="password"
        type="password"
        required
        minLength={firstTime ? 8 : undefined}
        autoComplete={firstTime ? "new-password" : "current-password"}
        placeholder={firstTime ? "Choose a password (8+ characters)" : "Password"}
        className={field}
      />
      <button type="submit" disabled={pending} className={button}>
        {pending ? "One moment…" : firstTime ? "Set password and log in" : "Log in"}
      </button>
      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
      <button type="button" onClick={() => setFirstTime(!firstTime)} className="text-sm text-neutral-500 underline">
        {firstTime ? "Already set a password? Log in" : "First time here? Set your password"}
      </button>
      {!firstTime && <p className="text-sm text-neutral-400">Forgot your password? Ask Barry to reset it.</p>}
    </form>
  );
}
