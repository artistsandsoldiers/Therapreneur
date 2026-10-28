"use client";

import { useMemo, useState, useTransition } from "react";
import { addPatient, saveCapture, type CaptureInput } from "./actions";
import { PatientFields, Toggle } from "../patients/patient-fields";
import { WhenFields } from "./when-fields";
import { button, field, label, secondaryButton } from "@/app/ui";
import type { CaptureData, Patient } from "@/lib/capture-data";
import { sessionBillTo, type CaptureLineInput } from "@/lib/capture";
import { formatRands, parseRands } from "@/lib/money";
import { findRate, invoiceTotal, practicePrice } from "@/lib/pricing";
import type { Enums } from "@/lib/supabase/database.types";

type Line = CaptureLineInput & { typedPrice: string };

export type CaptureFormProps = CaptureData & {
  adjustmentPercent: number;
  /** Capturing a booked session, which has no invoice yet. */
  booked?: boolean;
  noShowPriceCents: number;
  initial: {
    sessionId: string | null;
    patientId: string;
    startsAt: string;
    durationMinutes: number;
    outcome: Enums<"session_outcome">;
    /** Who the invoice goes to, or null to start from the patient's usual choice. */
    billTo: Enums<"bill_to"> | null;
    note: string;
    lines: { billingCodeId: string; quantity: number; unitPriceCents: number }[];
  };
};

export function CaptureForm(props: CaptureFormProps) {
  const { codes, rates, medicalAids, referrers, defaultMedicalAidId, adjustmentPercent, noShowPriceCents, initial } = props;
  // Past patients stay out of the picker, unless this session is already theirs.
  const [patients, setPatients] = useState(() =>
    props.patients.filter((p) => !p.past_since || p.id === initial.patientId),
  );
  const [patientId, setPatientId] = useState(initial.patientId);
  const [chosenBillTo, setChosenBillTo] = useState<Enums<"bill_to">>(
    initial.billTo ?? patients.find((p) => p.id === initial.patientId)?.bill_to ?? "medical_aid",
  );
  const [addingPatient, setAddingPatient] = useState(patients.length === 0);
  const [startsAt, setStartsAt] = useState(initial.startsAt);
  const [duration, setDuration] = useState(String(initial.durationMinutes));
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
  const history = patient ? props.codeHistories[patient.id] : undefined;
  const durationMinutes = Number(duration);
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
  const billTo = patient ? sessionBillTo(outcome, chosenBillTo, patient) : null;
  const billToText = billTo === "medical_aid" ? medicalAidName(patient?.medical_aid_id ?? null) : billTo && "the patient";

  // A different patient starts from their own usual choice of who pays.
  function pickPatient(picked: Patient) {
    setPatientId(picked.id);
    setChosenBillTo(picked.bill_to);
  }

  const newLine = (billingCodeId: string, quantity = 1): Line => ({ billingCodeId, quantity, typedPriceCents: null, typedPrice: "" });

  function updateLine(billingCodeId: string, change: Partial<Line>) {
    setLines((current) => current.map((line) => (line.billingCodeId === billingCodeId ? { ...line, ...change } : line)));
  }

  function save() {
    setError(null);
    const input: CaptureInput = {
      sessionId: initial.sessionId,
      patientId,
      startsAt,
      durationMinutes,
      outcome,
      billTo: billTo ?? "patient",
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
              onChange={(event) => {
                const picked = patients.find((p) => p.id === event.target.value);
                if (picked) pickPatient(picked);
              }}
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
            {patient.medical_aid_id
              ? `${medicalAidName(patient.medical_aid_id)} · ${patient.member_number}`
              : "No medical aid"}
            {patient.icd10_codes.length > 0 && ` · ICD-10 ${patient.icd10_codes.join(", ")}`}
          </p>
        )}
        {addingPatient && (
          <AddPatient
            medicalAids={medicalAids}
            referrers={referrers}
            defaultMedicalAidId={defaultMedicalAidId}
            onCancel={patients.length ? () => setAddingPatient(false) : undefined}
            onAdded={(added) => {
              setPatients((current) =>
                [...current, added].sort((a, b) =>
                  `${a.first_name} ${a.last_name}`.localeCompare(`${b.first_name} ${b.last_name}`),
                ),
              );
              pickPatient(added);
              setAddingPatient(false);
            }}
          />
        )}
      </section>

      <WhenFields startsAt={startsAt} onStartsAt={setStartsAt} duration={duration} onDuration={setDuration} />

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
          {patient?.medical_aid_id && (
            <Toggle
              label="Who pays for this session"
              name="bill_to"
              value={chosenBillTo}
              options={[
                ["medical_aid", "Medical aid"],
                ["patient", "Patient"],
              ]}
              onChange={setChosenBillTo}
            />
          )}
          <div className="flex items-baseline justify-between gap-3">
            <h2 className={label}>Billing codes</h2>
            {history && history.last.length > 0 && (
              <button
                type="button"
                onClick={() => setLines(history.last.map((line) => newLine(line.billingCodeId, line.quantity)))}
                className="text-sm font-medium text-accent"
              >
                Same as last time
              </button>
            )}
          </div>
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
            onPick={(billingCodeId) => setLines((current) => [...current, newLine(billingCodeId)])}
          />
          {history && (
            <UsualCodes
              codes={history.usual.flatMap((id) => {
                const code = codes.find((c) => c.id === id);
                return code && !lines.some((line) => line.billingCodeId === id) ? [code] : [];
              })}
              onPick={(billingCodeId) => setLines((current) => [...current, newLine(billingCodeId)])}
            />
          )}
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
          <span className="truncate text-sm text-neutral-500">{billToText ? `Bill to ${billToText}` : "Total"}</span>
          <span className="text-lg font-semibold">{formatRands(total)}</span>
        </div>
        <button type="button" onClick={save} disabled={saving || addingPatient} className={button}>
          {saving ? "Saving…" : initial.sessionId && !props.booked ? "Save changes" : "Save invoice"}
        </button>
        {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
      </section>
    </div>
  );
}

/** Codes used before for this patient, one tap to add. */
function UsualCodes({ codes, onPick }: { codes: CaptureData["codes"]; onPick: (id: string) => void }) {
  if (codes.length === 0) return null;
  return (
    <div>
      <p className="mb-1.5 text-sm text-neutral-500">Used before for this patient</p>
      <div className="flex flex-wrap gap-2">
        {codes.map((code) => (
          <button
            key={code.id}
            type="button"
            onClick={() => onPick(code.id)}
            title={code.description}
            className="max-w-full truncate rounded-full border border-neutral-200 px-3 py-1.5 text-sm hover:bg-neutral-50"
          >
            <span className="font-medium">+ {code.code}</span>{" "}
            <span className="text-neutral-500">{code.description}</span>
          </button>
        ))}
      </div>
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

export function AddPatient({
  medicalAids,
  referrers,
  defaultMedicalAidId,
  onAdded,
  onCancel,
}: {
  medicalAids: CaptureData["medicalAids"];
  referrers: CaptureData["referrers"];
  defaultMedicalAidId: string;
  onAdded: (patient: Patient) => void;
  onCancel?: () => void;
}) {
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
      <PatientFields medicalAids={medicalAids} referrers={referrers} defaultMedicalAidId={defaultMedicalAidId} />
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
