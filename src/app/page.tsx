import { WaitlistForm } from "./waitlist-form";

const POINTS = [
  {
    title: "Capture a session in seconds",
    body: "Pick your billing codes on your phone after a session and the invoice is done.",
  },
  {
    title: "Medical aid claims, sorted",
    body: "Claims batched per medical aid, sent, and tracked until they're paid.",
  },
  {
    title: "Know where you stand",
    body: "See what you've earned each month and who still owes you, at a glance.",
  },
];

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

      <section className="grid flex-1 content-center gap-10 py-12 md:grid-cols-[1.2fr_1fr] md:gap-x-16">
        <div className="md:col-start-1">
          <p className="text-sm font-medium text-accent">
            For OTs, physios and speech therapists in private practice
          </p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight text-balance md:text-5xl">
            Run your practice, not your paperwork.
          </h1>
          <p className="mt-5 text-lg text-neutral-600 text-pretty">
            Software, support and business coaching that take care of the business side of
            private practice, so you can spend your time with patients.
          </p>
        </div>

        <div className="rounded-xl border border-neutral-200 p-6 md:col-start-2 md:row-span-2 md:row-start-1 md:self-center md:p-8">
          <h2 className="text-lg font-semibold">Be first to try it</h2>
          <p className="mt-1 mb-5 text-neutral-500">
            We&apos;re building Therapreneur with therapists. Join the waiting list to get early
            access and help shape it.
          </p>
          <WaitlistForm source={source} />
        </div>

        <ul className="flex flex-col gap-6 md:col-start-1">
          {POINTS.map((point) => (
            <li key={point.title} className="border-l-2 border-neutral-200 pl-4">
              <p className="font-medium">{point.title}</p>
              <p className="mt-1 text-neutral-500">{point.body}</p>
            </li>
          ))}
        </ul>
      </section>

      <footer className="py-8 text-sm text-neutral-400">
        © {new Date().getFullYear()} Therapreneur · Made in South Africa
      </footer>
    </main>
  );
}
