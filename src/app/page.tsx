import { WaitlistForm } from "./waitlist-form";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const ref = params.ref ?? params.utm_source;
  const source = typeof ref === "string" ? ref : null;

  return (
    <main className="mx-auto flex min-h-dvh max-w-5xl flex-col px-6">
      <header className="py-6">
        <span className="font-semibold tracking-tight">Therapreneur</span>
      </header>

      <section className="grid flex-1 content-center items-center gap-10 py-12 md:grid-cols-[1.2fr_1fr] md:gap-16">
        <div>
          <p className="text-sm font-medium text-accent">
            For OTs, physios and speech therapists in private practice
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-balance md:text-4xl">
            Software, support and business coaching that take care of the business side of
            private practice, so you can spend your time with patients.
          </h1>
        </div>

        <div className="rounded-xl border border-neutral-200 p-6 md:p-8">
          <h2 className="mb-5 text-lg font-semibold">Be first to try it</h2>
          <WaitlistForm source={source} />
        </div>
      </section>

      <footer className="py-8 text-sm text-neutral-400">
        © {new Date().getFullYear()} Therapreneur · Made in South Africa
      </footer>
    </main>
  );
}
