import Link from "next/link";
import { requireSetUpPractice } from "@/lib/practice";
import { logOut } from "@/app/login/actions";

export default async function PracticeLayout({ children }: { children: React.ReactNode }) {
  const { practice } = await requireSetUpPractice();

  return (
    <div className="mx-auto min-h-dvh max-w-2xl px-4 pb-16">
      <header className="flex items-center justify-between gap-4 border-b border-neutral-100 py-4">
        <Link href="/invoices" className="truncate font-semibold tracking-tight">{practice.name}</Link>
        <nav className="flex shrink-0 items-center gap-4 text-sm text-neutral-500">
          <Link href="/setup">Settings</Link>
          <form action={logOut}>
            <button type="submit">Log out</button>
          </form>
        </nav>
      </header>
      {children}
    </div>
  );
}
