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
  const [hasMedicalAid, setHasMedicalAid] = useState(patient ? patient.medical_aid_id !== null : true);
  const [billTo, setBillTo] = useState(patient?.bill_to ?? "medical_aid");
  const [isMainMember, setIsMainMember] = useState(
    !patient?.main_member_name || patient.main_member_name === `${patient.first_name} ${patient.last_name}`,
  );

  return (
    <>
      <div className="grid grid-cols-2 gap-2">
        <input name="first_name" defaultValue={patient?.first_name} placeholder="First name" aria-label="First name" autoComplete="off" className={field} />
        <input name="last_name" defaultValue={patient?.last_name} placeholder="Surname" aria-label="Surname" autoComplete="off" className={field} />
      </div>
      <div>
        <label htmlFor="date_of_birth" className="mb-1 block text-sm text-neutral-500">
          Date of birth{!hasMedicalAid && " (optional)"}
        </label>
        <input id="date_of_birth" name="date_of_birth" type="date" defaultValue={patient?.date_of_birth ?? ""} className={field} />
      </div>
      <Toggle
        label="Has medical aid"
        name="has_medical_aid"
        value={hasMedicalAid ? "yes" : "no"}
        options={[
          ["yes", "Yes"],
          ["no", "No"],
        ]}
        onChange={(value) => setHasMedicalAid(value === "yes")}
      />
      {hasMedicalAid && (
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
            <div className="grid grid-cols-[1fr_8rem] gap-2">
              <input
                name="main_member_name"
                defaultValue={patient?.main_member_name ?? ""}
                placeholder="Main member's full name"
                aria-label="Main member"
                className={field}
              />
              <input
                name="dependant_code"
                defaultValue={patient?.dependant_code === "00" ? "" : (patient?.dependant_code ?? "")}
                placeholder="Dependant code"
                aria-label="Dependant code"
                inputMode="numeric"
                maxLength={2}
                className={field}
              />
            </div>
          )}
          <div className="grid grid-cols-2 gap-2">
            <input
              name="referring_doctor_name"
              defaultValue={patient?.referring_doctor_name ?? ""}
              placeholder="Referring doctor (optional)"
              aria-label="Referring doctor"
              className={field}
            />
            <input
              name="referring_doctor_practice_number"
              defaultValue={patient?.referring_doctor_practice_number ?? ""}
              placeholder="Doctor's practice no."
              aria-label="Referring doctor's practice number"
              className={field}
            />
          </div>
          <Toggle
            label="Who pays you"
            name="bill_to"
            value={billTo}
            options={[
              ["medical_aid", "Medical aid"],
              ["patient", "Patient"],
            ]}
            onChange={setBillTo}
          />
          {billTo === "patient" && (
            <p className="-mt-2 text-sm text-neutral-500">Their invoices still show their medical aid details, so they can claim back.</p>
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

/** A two-way choice shown as a segmented control, posted as a radio group. */
export function Toggle<T extends string>({
  label,
  name,
  value,
  options,
  onChange,
}: {
  label: string;
  name: string;
  value: T;
  options: [T, string][];
  onChange: (value: T) => void;
}) {
  return (
    <fieldset>
      <legend className="mb-1 block text-sm text-neutral-500">{label}</legend>
      <div className="grid grid-cols-2 gap-1 rounded-lg bg-neutral-100 p-1">
        {options.map(([option, text]) => (
          <label
            key={option}
            className={`cursor-pointer rounded-md py-2 text-center font-medium ${value === option ? "bg-white shadow-sm" : "text-neutral-500"}`}
          >
            <input
              type="radio"
              name={name}
              value={option}
              checked={value === option}
              onChange={() => onChange(option)}
              className="sr-only"
            />
            {text}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
