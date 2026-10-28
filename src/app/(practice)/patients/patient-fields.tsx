"use client";

import { useState } from "react";
import { field } from "@/app/ui";
import type { MedicalAid, Patient } from "@/lib/capture-data";

/** The patient form's fields, shared by capture's Add patient and the Patients pages. */
export function PatientFields({
  medicalAids,
  defaultMedicalAidId,
  patient,
}: {
  medicalAids: MedicalAid[];
  defaultMedicalAidId: string;
  patient?: Patient;
}) {
  const [payerType, setPayerType] = useState(patient?.payer_type ?? "medical_aid");
  const [isMainMember, setIsMainMember] = useState(
    !patient?.main_member_name || patient.main_member_name === `${patient.first_name} ${patient.last_name}`,
  );

  return (
    <>
      <div className="grid grid-cols-2 gap-2">
        <input name="first_name" defaultValue={patient?.first_name} placeholder="First name" aria-label="First name" autoComplete="off" className={field} />
        <input name="last_name" defaultValue={patient?.last_name} placeholder="Surname" aria-label="Surname" autoComplete="off" className={field} />
      </div>
      <div className="grid grid-cols-2 gap-1 rounded-lg bg-neutral-100 p-1">
        {(
          [
            ["medical_aid", "Medical aid"],
            ["cash", "Cash"],
          ] as const
        ).map(([value, text]) => (
          <label
            key={value}
            className={`cursor-pointer rounded-md py-2 text-center font-medium ${payerType === value ? "bg-white shadow-sm" : "text-neutral-500"}`}
          >
            <input
              type="radio"
              name="payer_type"
              value={value}
              checked={payerType === value}
              onChange={() => setPayerType(value)}
              className="sr-only"
            />
            {text}
          </label>
        ))}
      </div>
      {payerType === "medical_aid" && (
        <>
          <select
            name="medical_aid_id"
            aria-label="Medical aid"
            defaultValue={patient?.medical_aid_id ?? defaultMedicalAidId}
            className={field}
          >
            {medicalAids.map((aid) => <option key={aid.id} value={aid.id}>{aid.name}</option>)}
          </select>
          <div className="grid grid-cols-2 gap-2">
            <input name="plan" defaultValue={patient?.plan ?? ""} placeholder="Plan (optional)" aria-label="Plan" className={field} />
            <input name="member_number" defaultValue={patient?.member_number ?? ""} placeholder="Member number" aria-label="Member number" className={field} />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="patient_is_main_member"
              value="yes"
              checked={isMainMember}
              onChange={(event) => setIsMainMember(event.target.checked)}
              className="accent-accent"
            />
            The patient is the main member
          </label>
          {!isMainMember && (
            <input
              name="main_member_name"
              defaultValue={patient?.main_member_name ?? ""}
              placeholder="Main member's full name"
              aria-label="Main member"
              className={field}
            />
          )}
        </>
      )}
      <div>
        <input
          name="icd10_codes"
          defaultValue={patient?.icd10_codes.join(", ")}
          placeholder="ICD-10 codes, e.g. M54.5, S52.50"
          aria-label="ICD-10 codes"
          autoCapitalize="characters"
          className={field}
        />
        <p className="mt-1 text-sm text-neutral-500">From the referring doctor.</p>
      </div>
    </>
  );
}
