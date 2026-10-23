import type { Metadata } from "next";
import Link from "next/link";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Log in · Therapreneur" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const notInvited = "not-invited" in (await searchParams);

  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center gap-6 px-6">
      <div>
        <Link href="/" className="font-semibold tracking-tight">Therapreneur</Link>
        <h1 className="mt-6 text-2xl font-semibold tracking-tight">Log in to your practice</h1>
      </div>
      {notInvited && (
        <p role="alert" className="text-sm text-red-600">
          Your email isn&apos;t linked to a practice yet. Ask Barry for an invite.
        </p>
      )}
      <LoginForm />
    </main>
  );
}
