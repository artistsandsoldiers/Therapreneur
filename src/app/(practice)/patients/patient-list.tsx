"use client";

import Link from "next/link";
import { useState } from "react";
import { bottomLeft, field, list, listHead, listRow } from "@/app/ui";

type Row = { id: string; name: string; payer: string; lastSession: string | null };

const cols = "md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)]";

/** The patient list with a search box that filters as she types. */
export function PatientList({ patients, empty }: { patients: Row[]; empty: string }) {
  const [query, setQuery] = useState("");
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  const matches = patients.filter((p) => words.every((word) => `${p.name} ${p.payer}`.toLowerCase().includes(word)));

  if (patients.length === 0) return <p className="mt-6 text-neutral-500">{empty}</p>;

  return (
    <>
      <input
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search by name or medical aid"
        aria-label="Search patients"
        className={`${field} mt-4 md:max-w-sm`}
      />
      <div className={`${listHead} ${cols} mt-4`}>
        <span>Name</span>
        <span>Last session</span>
        <span className="text-right">Pays</span>
      </div>
      <ul className={`${list} mt-4 md:mt-0`}>
        {matches.map((patient) => (
          <li key={patient.id}>
            <Link href={`/patients/${patient.id}`} className={`${listRow} ${cols}`}>
              <p className="truncate font-medium">{patient.name}</p>
              <p className={`${bottomLeft} text-sm text-neutral-500`}>
                {patient.lastSession ? (
                  <>
                    <span className="md:hidden">Last session </span>
                    {patient.lastSession}
                  </>
                ) : (
                  "No sessions yet"
                )}
              </p>
              <span className="col-start-2 row-span-2 row-start-1 text-right text-sm text-neutral-500 md:col-start-auto md:row-span-1 md:row-start-auto">
                {patient.payer}
              </span>
            </Link>
          </li>
        ))}
      </ul>
      {matches.length === 0 && <p className="mt-4 text-neutral-500">No patients match.</p>}
    </>
  );
}
