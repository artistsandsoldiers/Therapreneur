import type { Metadata } from "next";
import Link from "next/link";
import { DistancesForm } from "./distances-form";
import { Readings } from "../settings/car-section";
import { list, listHead, listRow, secondaryButton } from "@/app/ui";
import { friendlyDate, toLocalInput } from "@/lib/dates";
import { taxYearStart } from "@/lib/expenses";
import { loadLogbook, type CarLogbook } from "@/lib/logbook-data";
import { requireSetUpPractice } from "@/lib/practice";
import { formatKm } from "@/lib/travel";
import { stopLabel, type Trip } from "@/lib/trips";

export const metadata: Metadata = { title: "Logbook · Therapreneur" };

// Worked out from the calendar every time it opens.
export const dynamic = "force-dynamic";

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const DAY = 24 * 60 * 60 * 1000;

// A reading older than this nudges for a new one, so the business share stays up to date.
const READING_DUE_DAYS = 31;

export default async function LogbookPage({ searchParams }: { searchParams: Promise<{ year?: string }> }) {
  const { supabase, practice } = await requireSetUpPractice();
  const today = toLocalInput(new Date()).slice(0, 10);
  const thisYear = Number(taxYearStart(today).slice(0, 4));
  const asked = Number((await searchParams).year);
  const year = asked === thisYear - 1 ? asked : thisYear;
  const logbook = await loadLogbook(supabase, practice, `${year}-03-01`);
  const nothingYet = logbook.logbooks.length === 0 && logbook.tripsWithoutCar.length === 0;

  return (
    <main className="py-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Logbook</h1>
          <p className="mt-1 text-sm text-neutral-500">
            Your business trips for SARS, worked out from your calendar. Tax year 1 March {year} to end of February {year + 1}.
          </p>
        </div>
        <div className="flex gap-1 rounded-lg bg-neutral-100 p-1 text-sm">
          {[thisYear, thisYear - 1].map((y) => (
            <Link
              key={y}
              href={y === thisYear ? "/logbook" : `/logbook?year=${y}`}
              className={`rounded-md px-3 py-1.5 font-medium ${y === year ? "bg-white shadow-sm" : "text-neutral-500"}`}
            >
              {y}/{String(y + 1).slice(2)}
            </Link>
          ))}
        </div>
      </div>

      <Problems logbook={logbook} />

      {nothingYet && (
        <p className="text-neutral-500">
          No business trips yet. Add your car and places under <Link href="/settings" className="text-accent">Settings</Link>,
          and book sessions in the <Link href="/calendar" className="text-accent">calendar</Link>.
        </p>
      )}

      {logbook.logbooks.map((carLogbook) => (
        <CarSection key={carLogbook.car.id} logbook={carLogbook} year={year} today={today} />
      ))}

      {logbook.tripsWithoutCar.length > 0 && (
        <section className="mt-10">
          <h2 className="text-lg font-semibold">Trips with no car</h2>
          <p className="mb-3 text-sm text-neutral-500">
            These happened before the car you added. <Link href="/settings" className="text-accent">Add the car</Link> you used then, or
            change when your car started.
          </p>
          <TripList trips={logbook.tripsWithoutCar} />
        </section>
      )}
    </main>
  );
}

function Problems({ logbook }: { logbook: Awaited<ReturnType<typeof loadLogbook>> }) {
  const notes: React.ReactNode[] = [];
  if (logbook.needsHomeAddress) {
    notes.push(<>Add your home address under <Link href="/settings" className="text-accent">Settings</Link>. Every work day starts and ends there.</>);
  }
  if (logbook.patientsWithoutAddress.length) {
    notes.push(<>Add a home address for {logbook.patientsWithoutAddress.join(", ")} on their patient page.</>);
  }
  if (logbook.visitsWithoutPlace) {
    const n = logbook.visitsWithoutPlace;
    notes.push(<>{n} {n === 1 ? "session doesn't" : "sessions don't"} say where {n === 1 ? "it was" : "they were"}, so {n === 1 ? "it isn't" : "they aren't"} counted. Tap one in the <Link href="/calendar" className="text-accent">calendar</Link> and use “Change where”.</>);
  }

  return (
    <div className="mb-8 flex flex-col gap-4">
      {notes.length > 0 && (
        <ul className="flex list-disc flex-col gap-1 rounded-lg border border-amber-200 bg-amber-50/50 py-3 pr-4 pl-8 text-sm text-neutral-700">
          {notes.map((note, i) => <li key={i}>{note}</li>)}
        </ul>
      )}
      {logbook.missing.length > 0 && <DistancesForm missing={logbook.missing} />}
    </div>
  );
}

function CarSection({ logbook, year, today }: { logbook: CarLogbook; year: number; today: string }) {
  const { car, share } = logbook;
  const lastReading = car.readings.at(-1);
  const readingDue = !car.ended_on && (!lastReading || Date.parse(today) - Date.parse(lastReading.readOn) > READING_DUE_DAYS * DAY);
  const exportHref = (anonymous: boolean) => `/logbook/export?year=${year}&car=${car.id}${anonymous ? "&anonymous=1" : ""}`;

  return (
    <section className="mt-10 first-of-type:mt-0">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 className="text-lg font-semibold">
          {car.name}
          {car.registration && <span className="ml-2 font-normal text-neutral-500">{car.registration}</span>}
        </h2>
        <div className="flex gap-2 text-sm">
          <a href={exportHref(false)} className={`${secondaryButton} py-1.5`}>Download</a>
          <a href={exportHref(true)} className={`${secondaryButton} py-1.5`}>Download without patient names</a>
        </div>
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3">
        <Figure label="Business km this year" value={formatKm(logbook.businessKm)} />
        <Figure
          label="Business share"
          value={share.share === null ? "Not yet" : `${Math.round(share.share * 100)}%`}
          note={
            share.share === null
              ? "Needs two odometer readings"
              : `${formatKm(share.businessKm)} of ${formatKm(share.totalKm!)}, ${friendlyDate(share.from!)} to ${friendlyDate(share.to!)}`
          }
        />
        <Figure label="Business trips" value={String(logbook.trips.length)} />
      </dl>

      {!car.ended_on && (
        <div className="mt-6 lg:max-w-xl">
          {readingDue && (
            <p className="mb-2 text-sm text-amber-700">
              Time for an odometer reading. One a month keeps your business share up to date, and SARS needs one on 1 March.
            </p>
          )}
          <Readings car={{ ...car, readings: car.readings }} today={today} />
        </div>
      )}

      <h3 className="mt-8 mb-2 font-medium">Business trips</h3>
      {logbook.trips.length === 0 ? <p className="text-neutral-500">None yet this tax year.</p> : <TripList trips={logbook.trips} />}
    </section>
  );
}

function Figure({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div>
      <dt className="text-sm text-neutral-500">{label}</dt>
      <dd className="text-2xl font-semibold tracking-tight">{value}</dd>
      {note && <dd className="text-xs text-neutral-500">{note}</dd>}
    </div>
  );
}

/** Business trips by month, newest first. */
function TripList({ trips }: { trips: Trip[] }) {
  const months = new Map<string, Trip[]>();
  for (const trip of [...trips].reverse()) months.set(trip.date.slice(0, 7), [...(months.get(trip.date.slice(0, 7)) ?? []), trip]);
  const columns = "md:grid-cols-[8rem_minmax(0,1.2fr)_minmax(0,1fr)_5rem]";

  return (
    <div className="flex flex-col gap-6">
      {[...months].map(([month, monthTrips]) => (
        <div key={month}>
          <p className="mb-1 flex justify-between text-sm font-medium text-neutral-700">
            <span>{MONTHS[Number(month.slice(5)) - 1]} {month.slice(0, 4)}</span>
            <span>{formatKm(Math.round(monthTrips.reduce((t, trip) => t + (trip.km ?? 0), 0) * 10) / 10)}</span>
          </p>
          <div className={`${listHead} ${columns}`}>
            <span>Date</span>
            <span>Trip</span>
            <span>Reason</span>
            <span className="text-right">Km</span>
          </div>
          <ul className={list}>
            {monthTrips.map((trip, i) => (
              <li key={i} className={`${listRow} ${columns}`}>
                <span className="text-sm text-neutral-500">{friendlyDate(trip.date)}</span>
                <span className="col-start-1 row-start-2 truncate md:col-start-auto md:row-start-auto">
                  {stopLabel(trip.from)} → {stopLabel(trip.to)}
                </span>
                <span className="col-start-1 row-start-3 truncate text-sm text-neutral-500 md:col-start-auto md:row-start-auto">{trip.reason}</span>
                <span className="col-start-2 row-start-1 text-right md:col-start-auto md:row-start-auto">
                  {trip.km === null ? <span className="text-amber-700">?</span> : formatKm(trip.km)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
