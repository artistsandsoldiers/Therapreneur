"use client";

import Link from "next/link";
import { FilterBar, FilterSummary, SearchFilter, SelectFilter, useFilters } from "../filters";
import { bottomLeft, list, listHead, listRow } from "@/app/ui";
import { matchesSearch } from "@/lib/filters";

type Row = {
  id: string;
  name: string;
  payer: string;
  kind: "none" | "patient_pays" | "medical_aid_pays";
  lastSession: string | null;
};

const cols = "md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)]";

/** The patient list with a search box and a medical aid filter, which filter as she types or picks. */
export function PatientList({ patients, empty }: { patients: Row[]; empty: string }) {
  const filters = useFilters({ search: "", kind: "all" });
  const { values } = filters;
  const matches = patients.filter(
    (p) => matchesSearch(`${p.name} ${p.payer}`, values.search) && (values.kind === "all" || values.kind === p.kind),
  );

  if (patients.length === 0) return <p className="mt-6 text-neutral-500">{empty}</p>;

  return (
    <>
      <FilterBar>
        <SearchFilter value={values.search} onChange={(value) => filters.set("search", value)} placeholder="Search by name or medical aid" />
        <SelectFilter
          label="Medical aid"
          value={values.kind}
          onChange={(value) => filters.set("kind", value)}
          options={[
            ["all", "All patients"],
            ["medical_aid_pays", "Medical aid pays"],
            ["patient_pays", "Has medical aid, pays you"],
            ["none", "No medical aid"],
          ]}
        />
      </FilterBar>
      <FilterSummary active={filters.active} shown={matches.length} total={patients.length} noun="patients" onClear={filters.clear} />
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
