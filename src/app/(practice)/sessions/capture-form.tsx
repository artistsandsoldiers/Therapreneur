"use client";

import { useMemo, useState, useTransition } from "react";
import { addPatient, saveCapture, type CaptureInput } from "./actions";
import { button, field, label, secondaryButton } from "@/app/ui";
import type { CaptureData, Patient } from "@/lib/capture-data";
import type { CaptureLineInput } from "@/lib/capture";
import { formatRands, parseRands } from "@/lib/money";
import { findRate, invoiceTotal, practicePrice } from "@/lib/pricing";
import type { Enums } from "@/lib/supabase/database.types";

type Line = CaptureLineInput & { typedPrice: string };

export type CaptureFormProps = CaptureData & {
  adjustmentPercent: number;
  noShowPriceCents: number;
  initial: {
    sessionId: string | null;
    patientId: string;
    startsAt: string;
    outcome: Enums<"session_outcome">;
    note: string;
    lines: { billingCodeId: string; quantity: number; unitPriceCents: number }[];
  };
};

export function CaptureForm(props: CaptureFormProps) {
  const { codes, rates, medicalAids, defaultMedicalAidId, adjustmentPercent, noShowPriceCents, initial } = props;
  const [patients, setPatients] = useState(props.patients);
  const [patientId, setPatientId] = useState(initial.patientId);
  const [addingPatient, setAddingPatient] = useState(patients.length === 0);
  const [startsAt, setStartsAt] = useState(initial.startsAt);
  const [outcome, setOutcome] = useState(initial.outcome);
  const [note, setNote] = useState(initial.note);
  const [lines, setLines] = useState<Line[]>(
    initial.lines.map((line) => ({
      billingCodeId: line.billingCodeId,
      quantity: line.quantity,
      typedPriceCents: line.unitPriceCents,
      typedPrice: (line.unitPriceCents / 100).toFixed(2),
    })),
  );
  const [error, setError] = useState<string | null>(null);
  const [saving, startSaving] = useTransition();

  const patient = patients.find((p) => p.id === patientId);
  const medicalAidName = (id: string | null) => medicalAids.find((aid) => aid.id === id)?.name;

  // The same pricing the server uses, so what she sees is what gets saved.
  const fixedPrice = (billingCodeId: string) =>
    practicePrice(
      findRate(
        rates,
        billingCodeId,
        { patient: patient?.medical_aid_id ?? null, fallback: defaultMedicalAidId },
        startsAt.slice(0, 10),
      ),
      adjustmentPercent,
    );
  const pricedLines = lines.map((line) => ({
    ...line,
    fixedPrice: fixedPrice(line.billingCodeId),
  }));
  const total =
    outcome === "no_show"
      ? noShowPriceCents
      : invoiceTotal(
          pricedLines.map((line) => ({
            quantity: line.quantity,
            unitPriceCents: line.fixedPrice ?? line.typedPriceCents ?? 0,
          })),
        );
  const billTo =
    outcome === "no_show" || patient?.payer_type === "cash" ? "the patient" : medicalAidName(patient?.medical_aid_id ?? null);

  function updateLine(billingCodeId: string, change: Partial<Line>) {
    setLines((current) => current.map((line) => (line.billingCodeId === billingCodeId ? { ...line, ...change } : line)));
  }

  function save() {
    setError(null);
    const input: CaptureInput = {
      sessionId: initial.sessionId,
      patientId,
      startsAt,
      outcome,
      note,
      lines: lines.map(({ billingCodeId, quantity, typedPriceCents }) => ({ billingCodeId, quantity, typedPriceCents })),
    };
    startSaving(async () => {
      const result = await saveCapture(input);
      if (result?.error) setError(result.error);
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <section>
        <div className="flex items-end gap-2">
          <div className="flex-1">
            <label htmlFor="patient" className={label}>Patient</label>
            <select
              id="patient"
              value={patientId}
              onChange={(event) => setPatientId(event.target.value)}
              className={field}
            >
              <option value="" disabled>{patients.length ? "Choose a patient…" : "No patients yet"}</option>
              {patients.map((p) => (
                <option key={p.id} value={p.id}>{p.first_name} {p.last_name}</option>
              ))}
            </select>
          </div>
          {!addingPatient && (
            <button type="button" onClick={() => setAddingPatient(true)} className={secondaryButton}>
              + New
            </button>
          )}
        </div>
        {patient && !addingPatient && (
          <p className="mt-2 text-sm text-neutral-500">
            {patient.payer_type === "cash"
              ? "Cash patient"
              : `${medicalAidName(patient.medical_aid_id)} · ${patient.member_number}`}
            {patient.icd10_codes.length > 0 && ` · ICD-10 ${patient.icd10_codes.join(", ")}`}
          </p>
        )}
        {addingPatient && (
          <AddPatient
            medicalAids={medicalAids}
            defaultMedicalAidId={defaultMedicalAidId}
            onCancel={patients.length ? () => setAddingPatient(false) : undefined}
            onAdded={(added) => {
              setPatients((current) =>
                [...current, added].sort((a, b) =>
                  `${a.first_name} ${a.last_name}`.localeCompare(`${b.first_name} ${b.last_name}`),
                ),
              );
              setPatientId(added.id);
              setAddingPatient(false);
            }}
          />
        )}
      </section>

      <section>
        <label htmlFor="startsAt" className={label}>When</label>
        <input
          id="startsAt"
          type="datetime-local"
          value={startsAt}
          onChange={(event) => setStartsAt(event.target.value)}
          className={field}
        />
      </section>

      <section className="grid grid-cols-2 gap-1 rounded-lg bg-neutral-100 p-1">
        {(
          [
            ["attended", "Attended"],
            ["no_show", "No-show"],
          ] as const
        ).map(([value, text]) => (
          <button
            key={value}
            type="button"
            onClick={() => setOutcome(value)}
            aria-pressed={outcome === value}
            className={`rounded-md py-2 font-medium ${outcome === value ? "bg-white shadow-sm" : "text-neutral-500"}`}
          >
            {text}
          </button>
        ))}
      </section>

      {outcome === "no_show" ? (
        <p className="text-neutral-600">
          Billed to the patient at your no-show price of {formatRands(noShowPriceCents)}.
        </p>
      ) : (
        <section className="flex flex-col gap-3">
          <h2 className={label}>Billing codes</h2>
          {pricedLines.map((line) => {
            const code = codes.find((c) => c.id === line.billingCodeId);
            return (
              <div key={line.billingCodeId} className="rounded-lg border border-neutral-200 p-3">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm">
                    <span className="font-medium">{code?.code}</span>{" "}
                    <span className="text-neutral-500">{code?.description}</span>
                  </p>
                  <button
                    type="button"
                    aria-label={`Remove ${code?.code}`}
                    onClick={() => setLines((current) => current.filter((l) => l.billingCodeId !== line.billingCodeId))}
                    className="text-neutral-400"
                  >
                    ✕
                  </button>
                </div>
                <div className="mt-2 flex items-center justify-between gap-3">
                  <div className="flex items-center rounded-md border border-neutral-200">
                    <button
                      type="button"
                      aria-label="Fewer"
                      disabled={line.quantity <= 1}
                      onClick={() => updateLine(line.billingCodeId, { quantity: line.quantity - 1 })}
                      className="px-3 py-1.5 disabled:text-neutral-300"
                    >
                      −
                    </button>
                    <span className="w-6 text-center">{line.quantity}</span>
                    <button
                      type="button"
                      aria-label="More"
                      disabled={line.quantity >= 99}
                      onClick={() => updateLine(line.billingCodeId, { quantity: line.quantity + 1 })}
                      className="px-3 py-1.5 disabled:text-neutral-300"
                    >
                      +
                    </button>
                  </div>
                  {line.fixedPrice !== null ? (
                    <span className="font-medium">{formatRands(line.fixedPrice * line.quantity)}</span>
                  ) : (
                    <label className="flex items-center gap-2 text-sm whitespace-nowrap text-neutral-500">
                      Price R
                      <input
                        inputMode="decimal"
                        placeholder="0.00"
                        value={line.typedPrice}
                        onChange={(event) =>
                          updateLine(line.billingCodeId, {
                            typedPrice: event.target.value,
                            typedPriceCents: parseRands(event.target.value),
                          })
                        }
                        className={`${field.replace("w-full", "w-28")} py-1.5`}
                      />
                    </label>
                  )}
                </div>
              </div>
            );
          })}
          <CodePicker
            codes={codes.filter((code) => !lines.some((line) => line.billingCodeId === code.id))}
            onPick={(billingCodeId) =>
              setLines((current) => [...current, { billingCodeId, quantity: 1, typedPriceCents: null, typedPrice: "" }])
            }
          />
        </section>
      )}

      <section>
        <label htmlFor="note" className={label}>Note (optional)</label>
        <textarea
          id="note"
          rows={4}
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder="Type, or tap the microphone on your keyboard to dictate"
          className={field}
        />
        <p className="mt-1 text-sm text-neutral-500">Only you see your notes. They never go on the invoice.</p>
      </section>

      <section className="sticky bottom-0 -mx-4 flex flex-col gap-2 border-t border-neutral-100 bg-white px-4 py-3">
        <div className="flex items-baseline justify-between gap-3">
          <span className="truncate text-sm text-neutral-500">{billTo ? `Bill to ${billTo}` : "Total"}</span>
          <span className="text-lg font-semibold">{formatRands(total)}</span>
        </div>
        <button type="button" onClick={save} disabled={saving || addingPatient} className={button}>
          {saving ? "Saving…" : initial.sessionId ? "Save changes" : "Save invoice"}
        </button>
        {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
      </section>
    </div>
  );
}

function CodePicker({ codes, onPick }: { codes: CaptureData["codes"]; onPick: (id: string) => void }) {
  const [query, setQuery] = useState("");
  const matches = useMemo(() => {
    const words = query.toLowerCase().split(/\s+/).filter(Boolean);
    if (!words.length) return [];
    return codes
      .filter((code) => words.every((word) => `${code.code} ${code.description}`.toLowerCase().includes(word)))
      .slice(0, 8);
  }, [codes, query]);

  return (
    <div>
      <input
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Add a code: search by number or words"
        aria-label="Search billing codes"
        className={field}
      />
      {matches.length > 0 && (
        <ul className="mt-1 divide-y divide-neutral-100 rounded-md border border-neutral-200">
          {matches.map((code) => (
            <li key={code.id}>
              <button
                type="button"
                onClick={() => {
                  onPick(code.id);
                  setQuery("");
                }}
                className="w-full px-3 py-2.5 text-left text-sm hover:bg-neutral-50"
              >
                <span className="font-medium">{code.code}</span>{" "}
                <span className="text-neutral-500">{code.description}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {query && matches.length === 0 && <p className="mt-2 text-sm text-neutral-500">No codes match.</p>}
    </div>
  );
}

function AddPatient({
  medicalAids,
  defaultMedicalAidId,
  onAdded,
  onCancel,
}: {
  medicalAids: CaptureData["medicalAids"];
  defaultMedicalAidId: string;
  onAdded: (patient: Patient) => void;
  onCancel?: () => void;
}) {
  const [payerType, setPayerType] = useState<"medical_aid" | "cash">("medical_aid");
  const [isMainMember, setIsMainMember] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, startSaving] = useTransition();

  // A div, not a nested form: it reads its own fields so it can sit inside the capture screen.
  function submit(container: HTMLElement) {
    const form = new FormData();
    container.querySelectorAll<HTMLInputElement | HTMLSelectElement>("[name]").forEach((input) => {
      if (input instanceof HTMLInputElement && (input.type === "checkbox" || input.type === "radio") && !input.checked) return;
      form.set(input.name, input.value);
    });
    setError(null);
    startSaving(async () => {
      const result = await addPatient(form);
      if (result.patient) onAdded(result.patient);
      else setError(result.error ?? "Something went wrong.");
    });
  }

  return (
    <div className="mt-3 flex flex-col gap-3 rounded-lg border border-neutral-200 p-4" id="add-patient">
      <h2 className="font-semibold">New patient</h2>
      <div className="grid grid-cols-2 gap-2">
        <input name="first_name" placeholder="First name" aria-label="First name" autoComplete="off" className={field} />
        <input name="last_name" placeholder="Surname" aria-label="Surname" autoComplete="off" className={field} />
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
          <select name="medical_aid_id" aria-label="Medical aid" defaultValue={defaultMedicalAidId} className={field}>
            {medicalAids.map((aid) => <option key={aid.id} value={aid.id}>{aid.name}</option>)}
          </select>
          <div className="grid grid-cols-2 gap-2">
            <input name="plan" placeholder="Plan (optional)" aria-label="Plan" className={field} />
            <input name="member_number" placeholder="Member number" aria-label="Member number" className={field} />
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
            <input name="main_member_name" placeholder="Main member's full name" aria-label="Main member" className={field} />
          )}
        </>
      )}
      <div>
        <input name="icd10_codes" placeholder="ICD-10 codes, e.g. M54.5, S52.50" aria-label="ICD-10 codes" autoCapitalize="characters" className={field} />
        <p className="mt-1 text-sm text-neutral-500">From the referring doctor.</p>
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          disabled={saving}
          onClick={(event) => submit(event.currentTarget.closest("#add-patient")!)}
          className={`${button} flex-1`}
        >
          {saving ? "Adding…" : "Add patient"}
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel} className={secondaryButton}>Cancel</button>
        )}
      </div>
      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
