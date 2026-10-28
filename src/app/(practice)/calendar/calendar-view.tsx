"use client";

import FullCalendar from "@fullcalendar/react";
import interactionPlugin from "@fullcalendar/interaction";
import timeGridPlugin from "@fullcalendar/timegrid";
import type { EventChangeArg, EventInput, EventSourceFuncArg } from "@fullcalendar/core";
import { useCallback, useEffect, useRef, useState } from "react";
import { loadCalendar, moveSession, type CalendarSession, type Scope } from "./actions";
import { BookForm, type BookFormProps } from "./book-form";
import { SessionSheet } from "./session-sheet";
import { Modal } from "../modal";
import { button, secondaryButton } from "@/app/ui";
import { addDaysLocal, sessionState } from "@/lib/calendar";
import { friendlyDate, toLocalInput } from "@/lib/dates";

// The calendar shows South African wall-clock times whatever the device's time zone: times go in as
// "YYYY-MM-DDTHH:mm" and the calendar treats them as UTC, so nothing is shifted on the way in or out.
const wall = (date: Date) => date.toISOString().slice(0, 16);

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

type Props = Omit<BookFormProps, "startsAt" | "durationMinutes" | "onBooked"> & { sessionMinutes: number };

/** Desktop: a week to drag sessions around in. Phone: one day at a time, with the week's days above it. */
export function CalendarView({ sessionMinutes, ...formProps }: Props) {
  const calendar = useRef<FullCalendar>(null);
  const [wide, setWide] = useState<boolean | null>(null);
  const [shown, setShown] = useState<{ start: string; end: string }>({ start: "", end: "" });
  const [booking, setBooking] = useState<{ startsAt: string; durationMinutes: number } | null>(null);
  const [open, setOpen] = useState<CalendarSession | null>(null);
  // A dragged repeat waits here while she picks whether the later sessions move too.
  const [dragged, setDragged] = useState<{ change: EventChangeArg; startsAt: string; durationMinutes: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const query = window.matchMedia("(min-width: 768px)");
    const update = () => setWide(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  const api = () => calendar.current?.getApi();
  const refresh = () => api()?.refetchEvents();

  // Kept the same between renders, or the calendar would load the sessions again each time.
  const events = useCallback(async (info: EventSourceFuncArg): Promise<EventInput[]> => {
    const sessions = await loadCalendar(wall(info.start), wall(info.end));
    return sessions.map((session) => {
      const start = toLocalInput(new Date(session.startsAt));
      return {
        id: session.id,
        start,
        end: addMinutes(start, session.durationMinutes),
        title: session.patientName,
        classNames: [`session-${sessionState(session)}`],
        editable: Boolean(wide) && !session.claimed,
        extendedProps: { session },
      };
    });
  }, [wide]);

  function book(startsAt: string, durationMinutes = sessionMinutes) {
    setError(null);
    setBooking({ startsAt, durationMinutes });
  }

  async function move(startsAt: string, durationMinutes: number, change: EventChangeArg, scope: Scope) {
    const result = await moveSession({ id: change.event.id, startsAt, durationMinutes, scope });
    if (result.error) {
      change.revert();
      setError(result.error);
    }
    refresh();
  }

  function changed(change: EventChangeArg) {
    setError(null);
    const session = change.event.extendedProps.session as CalendarSession;
    const startsAt = wall(change.event.start!);
    const durationMinutes = Math.round((change.event.end!.getTime() - change.event.start!.getTime()) / 60000);
    if (session.seriesId && !session.outcome) setDragged({ change, startsAt, durationMinutes });
    else move(startsAt, durationMinutes, change, "one");
  }

  // The week shown, Monday first, for the phone's strip of days.
  const day = shown.start.slice(0, 10);
  const monday = day && addDaysLocal(`${day}T00:00`, -((new Date(`${day}T00:00Z`).getUTCDay() + 6) % 7)).slice(0, 10);
  const week = monday ? WEEKDAYS.map((_, i) => addDaysLocal(`${monday}T00:00`, i).slice(0, 10)) : [];
  const today = toLocalInput(new Date()).slice(0, 10);

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h1 className="mr-2 text-2xl font-semibold tracking-tight">Calendar</h1>
          <button type="button" onClick={() => api()?.prev()} aria-label={wide ? "Last week" : "Day before"} className={iconButton}>‹</button>
          <button type="button" onClick={() => api()?.next()} aria-label={wide ? "Next week" : "Next day"} className={iconButton}>›</button>
          <button type="button" onClick={() => api()?.today()} className={`${secondaryButton} px-3 py-1.5 text-sm`}>Today</button>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-neutral-500">{shown.start && (wide ? weekTitle(shown.start, shown.end) : friendlyDate(day))}</span>
          <button type="button" onClick={() => book(nextHour())} className={button}>Book session</button>
        </div>
      </div>

      {wide === false && week.length > 0 && (
        <div className="mb-3 grid grid-cols-7 gap-1">
          {week.map((date, i) => (
            <button
              key={date}
              type="button"
              onClick={() => api()?.gotoDate(date)}
              aria-pressed={date === day}
              className={`flex flex-col items-center rounded-md py-1.5 text-sm ${
                date === day ? "bg-accent text-white" : date === today ? "text-accent" : "text-neutral-600"
              }`}
            >
              <span className="text-xs">{WEEKDAYS[i]}</span>
              <span className="font-medium">{Number(date.slice(8))}</span>
            </button>
          ))}
        </div>
      )}

      {error && <p role="alert" className="mb-3 text-sm text-red-600">{error}</p>}

      {wide !== null && (
        <div className="session-calendar">
          <FullCalendar
            key={wide ? "week" : "day"}
            ref={calendar}
            plugins={[timeGridPlugin, interactionPlugin]}
            initialView={wide ? "timeGridWeek" : "timeGridDay"}
            initialDate={shown.start.slice(0, 10) || undefined}
            timeZone="UTC"
            now={() => toLocalInput(new Date())}
            firstDay={1}
            headerToolbar={false}
            allDaySlot={false}
            slotMinTime="06:00:00"
            slotMaxTime="20:00:00"
            snapDuration="00:15:00"
            slotLabelFormat={{ hour: "2-digit", minute: "2-digit", hour12: false }}
            eventTimeFormat={{ hour: "2-digit", minute: "2-digit", hour12: false }}
            dayHeaderContent={(arg) => `${WEEKDAYS[(arg.date.getUTCDay() + 6) % 7]} ${arg.date.getUTCDate()}`}
            dayHeaders={wide}
            height="auto"
            nowIndicator
            slotEventOverlap={false}
            selectable={wide}
            select={(info) => {
              const minutes = Math.round((info.end.getTime() - info.start.getTime()) / 60000);
              // A click selects one half-hour slot, so it books the usual length; dragging picks the length.
              book(wall(info.start), minutes > 30 ? minutes : sessionMinutes);
              api()?.unselect();
            }}
            dateClick={(info) => !wide && book(wall(info.date))}
            eventClick={(info) => setOpen(info.event.extendedProps.session as CalendarSession)}
            eventDrop={changed}
            eventResize={changed}
            events={events}
            datesSet={(info) => setShown({ start: wall(info.start), end: wall(info.end) })}
            eventContent={(arg) => {
              const session = arg.event.extendedProps.session as CalendarSession;
              return (
                <div className="overflow-hidden px-1 py-0.5 text-xs leading-tight">
                  <div className="flex items-center gap-1 truncate font-medium">
                    {session.claimed && <Lock />}
                    {session.patientName}
                  </div>
                  <div className="opacity-80">{arg.timeText}</div>
                </div>
              );
            }}
          />
        </div>
      )}

      <Modal open={booking !== null} onClose={() => setBooking(null)} title="Book session">
        {booking && (
          <BookForm
            {...formProps}
            startsAt={booking.startsAt}
            durationMinutes={booking.durationMinutes}
            onBooked={() => {
              setBooking(null);
              refresh();
            }}
          />
        )}
      </Modal>

      <Modal open={open !== null} onClose={() => setOpen(null)} title={open?.patientName ?? "Session"}>
        {open && (
          <SessionSheet
            session={open}
            onChanged={() => {
              setOpen(null);
              refresh();
            }}
          />
        )}
      </Modal>

      <Modal
        open={dragged !== null}
        onClose={() => {
          dragged?.change.revert();
          setDragged(null);
        }}
        title="Move a repeating session"
      >
        {dragged && (
          <div className="flex flex-col gap-4">
            <p>Move just this session, or this one and the later sessions in the repeat by the same amount?</p>
            <div className="flex flex-wrap gap-2">
              {(
                [
                  ["one", "This session only"],
                  ["following", "This and following"],
                ] as const
              ).map(([scope, text]) => (
                <button
                  key={scope}
                  type="button"
                  onClick={() => {
                    move(dragged.startsAt, dragged.durationMinutes, dragged.change, scope);
                    setDragged(null);
                  }}
                  className={scope === "one" ? button : secondaryButton}
                >
                  {text}
                </button>
              ))}
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}

const iconButton = "rounded-md px-2.5 py-1 text-xl leading-none text-neutral-600 hover:bg-neutral-100";

function addMinutes(local: string, minutes: number): string {
  return wall(new Date(new Date(`${local}:00Z`).getTime() + minutes * 60000));
}

/** The next whole hour today, for a booking started from the button. */
function nextHour(): string {
  const now = toLocalInput(new Date());
  return addMinutes(`${now.slice(0, 13)}:00`, 60);
}

/** "26 Oct – 1 Nov 2026" for the week shown. The end is the Monday after, so the Sunday is a day before. */
function weekTitle(start: string, end: string): string {
  const last = addMinutes(end, -1);
  const part = (local: string) => `${Number(local.slice(8, 10))} ${MONTHS[Number(local.slice(5, 7)) - 1]}`;
  return `${part(start)} – ${part(last)} ${last.slice(0, 4)}`;
}

function Lock() {
  return (
    <svg viewBox="0 0 16 16" fill="currentColor" className="size-3 shrink-0" aria-label="Claimed">
      <path d="M5 7V5a3 3 0 1 1 6 0v2h.5A1.5 1.5 0 0 1 13 8.5v5a1.5 1.5 0 0 1-1.5 1.5h-7A1.5 1.5 0 0 1 3 13.5v-5A1.5 1.5 0 0 1 4.5 7H5Zm1.5 0h3V5a1.5 1.5 0 0 0-3 0v2Z" />
    </svg>
  );
}
