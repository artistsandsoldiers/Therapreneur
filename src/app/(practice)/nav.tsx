"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { logOut } from "@/app/login/actions";

// The main nav (docs/design.md): a left sidebar on desktop, a menu sliding in from the right on a phone. It carries the
// practice's logo and name, so the app feels like their own.
const LINKS = [
  { href: "/invoices", text: "Invoices" },
  { href: "/patients", text: "Patients" },
  { href: "/claims", text: "Claims" },
  { href: "/reconcile", text: "Reconcile" },
  { href: "/expenses", text: "Expenses" },
  { href: "/performance", text: "Performance" },
  { href: "/settings", text: "Settings" },
];

export function Nav({ practiceName, logoUrl }: { practiceName: string; logoUrl: string | null }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Close the phone menu after moving to another page, or on Escape.
  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!open) return;
    const close = (event: KeyboardEvent) => event.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [open]);

  const links = (
    <nav className="flex flex-1 flex-col gap-1">
      {LINKS.map((link) => {
        const active = pathname.startsWith(link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={active ? "page" : undefined}
            className={`rounded-md px-3 py-2 ${active ? "bg-neutral-100 font-medium text-neutral-900" : "text-neutral-600 hover:bg-neutral-50"}`}
          >
            {link.text}
          </Link>
        );
      })}
      <form action={logOut} className="mt-auto">
        <button type="submit" className="w-full rounded-md px-3 py-2 text-left text-neutral-500 hover:bg-neutral-50">
          Log out
        </button>
      </form>
    </nav>
  );

  return (
    <>
      <header className="sticky top-0 z-10 flex items-center justify-between gap-4 border-b border-neutral-100 bg-white px-4 py-3 md:hidden">
        <Link href="/invoices" className="flex min-w-0 items-center gap-2.5">
          {logoUrl && <Logo url={logoUrl} className="max-h-8 max-w-20" />}
          <span className="truncate font-semibold tracking-tight">{practiceName}</span>
        </Link>
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Open menu"
          aria-expanded={open}
          className="-mr-2 rounded-md p-2 text-neutral-700 hover:bg-neutral-50"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
            <path d="M4 7h16M4 12h16M4 17h16" />
          </svg>
        </button>
      </header>

      {open && (
        <div className="fixed inset-0 z-20 md:hidden" role="dialog" aria-modal="true" aria-label="Menu">
          <button type="button" aria-label="Close menu" onClick={() => setOpen(false)} className="absolute inset-0 bg-neutral-900/20" />
          <div className="absolute inset-y-0 right-0 flex w-72 max-w-[85vw] flex-col gap-4 bg-white p-4 shadow-xl">
            <div className="flex items-center justify-between gap-2">
              <span className="truncate font-semibold tracking-tight">{practiceName}</span>
              <button type="button" onClick={() => setOpen(false)} aria-label="Close menu" className="-mr-2 rounded-md p-2 text-neutral-500 hover:bg-neutral-50">
                ✕
              </button>
            </div>
            {links}
          </div>
        </div>
      )}

      <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col gap-6 border-r border-neutral-100 px-3 py-5 md:flex">
        <Link href="/invoices" className="flex flex-col gap-3 px-3">
          {logoUrl && <Logo url={logoUrl} className="max-h-14 max-w-40" />}
          <span className="truncate font-semibold tracking-tight">{practiceName}</span>
        </Link>
        {links}
      </aside>
    </>
  );
}

function Logo({ url, className }: { url: string; className: string }) {
  // eslint-disable-next-line @next/next/no-img-element -- a short-lived private link, which Next's image optimiser can't cache
  return <img src={url} alt="" className={`${className} self-start object-contain`} />;
}
