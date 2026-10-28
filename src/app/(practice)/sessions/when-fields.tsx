"use client";

import { field, label } from "@/app/ui";
import { isSessionLength } from "@/lib/capture";
import { friendlySessionTime, fromLocalInput } from "@/lib/dates";

/** A session's start and length: quick picks of 30, 45 and 60 minutes, or any length typed in. */
export function WhenFields({
  startsAt,
  onStartsAt,
  duration,
  onDuration,
}: {
  startsAt: string;
  onStartsAt: (value: string) => void;
  duration: string;
  onDuration: (value: string) => void;
}) {
  const durationMinutes = Number(duration);
  const startsAtIso = fromLocalInput(startsAt);
  const sessionTime = startsAtIso && isSessionLength(durationMinutes) ? friendlySessionTime(startsAtIso, durationMinutes) : null;

  return (
    <>
      <section>
        <label htmlFor="startsAt" className={label}>When</label>
        <input
          id="startsAt"
          type="datetime-local"
          value={startsAt}
          onChange={(event) => onStartsAt(event.target.value)}
          className={field}
        />
      </section>

      <section>
        <p className={label}>Length</p>
        <div className="flex flex-wrap items-center gap-2">
          {[30, 45, 60].map((minutes) => (
            <button
              key={minutes}
              type="button"
              onClick={() => onDuration(String(minutes))}
              aria-pressed={durationMinutes === minutes}
              className={`rounded-full border px-3 py-1.5 text-sm font-medium ${
                durationMinutes === minutes ? "border-accent bg-accent/10 text-accent" : "border-neutral-200 text-neutral-600"
              }`}
            >
              {minutes} min
            </button>
          ))}
          <label className="flex items-center gap-2 text-sm text-neutral-500">
            <input
              inputMode="numeric"
              value={duration}
              onChange={(event) => onDuration(event.target.value.replace(/\D/g, ""))}
              aria-label="Length in minutes"
              className={`${field.replace("w-full", "w-20")} py-1.5`}
            />
            min
          </label>
        </div>
        {sessionTime && <p className="mt-1 text-sm text-neutral-500">{sessionTime}</p>}
      </section>
    </>
  );
}
