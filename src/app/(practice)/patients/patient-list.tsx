"use client";

import Link from "next/link";
import { useState } from "react";
import { field } from "@/app/ui";

type Row = { id: string; name: string; payer: string; lastSession: string };

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
        className={`${field} mt-4`}
      />
      <ul className="mt-4 divide-y divide-neutral-100 border-y border-neutral-100">
        {matches.map((patient) => (
          <li key={patient.id}>
            <Link href={`/patients/${patient.id}`} className="flex items-center justify-between gap-4 py-3">
              <div className="min-w-0">
                <p className="truncate font-medium">{patient.name}</p>
                <p className="text-sm text-neutral-500">{patient.lastSession}</p>
              </div>
              <span className="shrink-0 text-sm text-neutral-500">{patient.payer}</span>
            </Link>
          </li>
        ))}
      </ul>
      {matches.length === 0 && <p className="mt-4 text-neutral-500">No patients match.</p>}
    </>
  );
}
