import { formatRands } from "@/lib/money";
import { roughly, type TaxEstimate, type TimelineStop } from "@/lib/tax";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const TITLES: Record<TimelineStop["kind"], string> = {
  start: "Tax year starts",
  first: "First payment",
  second: "Second payment",
  "top-up": "Top-up",
};

/** "31 Aug 2026" */
function shortDate(date: string): string {
  return `${Number(date.slice(8, 10))} ${MONTHS[Number(date.slice(5, 7)) - 1]} ${date.slice(0, 4)}`;
}

const about = (cents: number) => formatRands(roughly(cents)).replace(/\.00$/, "");

/** What a stop says under its date: what was paid, what's due, or what's coming. */
function status(stop: TimelineStop, next: TaxEstimate["next"]): string {
  if (stop.kind === "start") return "";
  const paid = stop.paidCents > 0 ? `Paid ${formatRands(stop.paidCents).replace(/\.00$/, "")}` : "";
  if (stop.state === "next" && next) {
    if (next.amountCents === 0) return paid ? `${paid}. Covered` : "Covered";
    return `${paid ? `${paid}. ` : ""}About ${about(next.amountCents)} due`;
  }
  if (stop.state === "past") return paid || "Nothing recorded";
  return stop.kind === "top-up" ? "Only if you're short" : "Coming up";
}

/**
 * The tax year's payment dates on one line, with today marked: top to bottom on a phone, left to right on a wider
 * screen, where each date sits at its true place in the year.
 */
export function Timeline({ stops, todayPosition, next }: { stops: TimelineStop[]; todayPosition: number; next: TaxEstimate["next"] }) {
  const dot = (stop: TimelineStop) =>
    stop.state === "next"
      ? "border-accent bg-accent"
      : stop.state === "past"
        ? "border-neutral-400 bg-neutral-400"
        : "border-neutral-300 bg-white";
  // On a phone, today goes between the last date behind it and the first one ahead.
  const todayIndex = stops.filter((s) => s.position <= todayPosition).length;

  return (
    <section aria-label="Provisional tax dates" className="rounded-lg border border-neutral-200 p-5">
      {/* Phone: a vertical list */}
      <ol className="relative flex flex-col gap-5 md:hidden">
        <span aria-hidden className="absolute top-2 bottom-2 left-[5px] w-px bg-neutral-200" />
        {stops.map((stop, i) => (
          <Fragmentish key={stop.kind} showToday={i === todayIndex}>
            <li className="relative flex gap-4">
              <span aria-hidden className={`relative mt-1.5 size-[11px] shrink-0 rounded-full border-2 ${dot(stop)}`} />
              <div>
                <p className={stop.state === "next" ? "font-semibold" : "font-medium"}>
                  {TITLES[stop.kind]} <span className="font-normal text-neutral-500">· {shortDate(stop.date)}</span>
                </p>
                {status(stop, next) && <p className="text-sm text-neutral-600">{status(stop, next)}</p>}
              </div>
            </li>
          </Fragmentish>
        ))}
        {todayIndex === stops.length && <TodayRow />}
      </ol>

      {/* Wider screens: a horizontal line, each date at its place in the year */}
      <div className="hidden md:block">
        <div className="relative mx-16 h-24">
          <span aria-hidden className="absolute top-8 right-0 left-0 h-px bg-neutral-200" />
          <span aria-hidden className="absolute top-8 left-0 h-0.5 -translate-y-1/4 bg-accent/40" style={{ width: `${todayPosition * 100}%` }} />
          <div className="absolute top-0 flex -translate-x-1/2 flex-col items-center" style={{ left: `${todayPosition * 100}%` }}>
            <span className="rounded bg-accent px-1.5 py-0.5 text-xs font-medium text-white">Today</span>
            <span aria-hidden className="h-3 w-0.5 bg-accent" />
          </div>
          {stops.map((stop) => (
            <div
              key={stop.kind}
              className="absolute top-8 flex w-36 -translate-x-1/2 flex-col items-center text-center"
              style={{ left: `${stop.position * 100}%` }}
            >
              <span aria-hidden className={`size-3 -translate-y-1/2 rounded-full border-2 ${dot(stop)}`} />
              <p className={`text-sm ${stop.state === "next" ? "font-semibold" : "font-medium"}`}>{TITLES[stop.kind]}</p>
              <p className="text-xs text-neutral-500">{shortDate(stop.date)}</p>
              {status(stop, next) && <p className="mt-0.5 text-xs text-neutral-600">{status(stop, next)}</p>}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function TodayRow() {
  return (
    <li className="relative flex items-center gap-4">
      <span aria-hidden className="relative -ml-px h-0.5 w-3 shrink-0 bg-accent" />
      <span className="rounded bg-accent px-1.5 py-0.5 text-xs font-medium text-white">Today</span>
    </li>
  );
}

function Fragmentish({ showToday, children }: { showToday: boolean; children: React.ReactNode }) {
  return (
    <>
      {showToday && <TodayRow />}
      {children}
    </>
  );
}
