// Practices are in South Africa (SAST, UTC+2 all year). Dates show as DD/MM/YYYY (docs/design.md).

export const TIME_ZONE = "Africa/Johannesburg";
const OFFSET = "+02:00";

/** "2026-10-23" -> "23/10/2026" */
export function formatDate(isoDate: string): string {
  const [year, month, day] = isoDate.slice(0, 10).split("-");
  return `${day}/${month}/${year}`;
}

/** A session time as "23/10/2026 14:30" in South African time. */
export function formatDateTime(timestamp: string): string {
  const local = toLocalInput(new Date(timestamp));
  return `${formatDate(local)} ${local.slice(11, 16)}`;
}

/** A moment as "YYYY-MM-DDTHH:mm" in South African time, for a datetime-local input. */
export function toLocalInput(date: Date): string {
  const shifted = new Date(date.getTime() + 2 * 60 * 60 * 1000);
  return shifted.toISOString().slice(0, 16);
}

/** "YYYY-MM-DDTHH:mm" typed in South African time -> an ISO timestamp. Null if it isn't one. */
export function fromLocalInput(value: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return null;
  const date = new Date(`${value}:00${OFFSET}`);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

/** A session as "23/10/2026 14:30–15:15" in South African time. */
export function formatSessionTime(startsAt: string, durationMinutes: number): string {
  const end = toLocalInput(new Date(new Date(startsAt).getTime() + durationMinutes * 60 * 1000));
  return `${formatDateTime(startsAt)}–${end.slice(11, 16)}`;
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DAY = 24 * 60 * 60 * 1000;

/** The South African calendar day of a date ("2026-10-23") or a timestamp. */
function localDay(value: string): string {
  return value.length > 10 ? toLocalInput(new Date(value)).slice(0, 10) : value.slice(0, 10);
}

/**
 * A date as practitioners read it on screen: "Today, Wed 28 Oct", "3 days ago, Sun 25 Oct", "In 2 days, Fri 30 Oct".
 * More than a week away it's just "Mon 12 Oct", with the year when it isn't this year. Invoices and PDFs keep
 * formatDate, since they're read later by someone else.
 */
export function friendlyDate(value: string, now = new Date()): string {
  const day = localDay(value);
  const today = toLocalInput(now).slice(0, 10);
  const daysAway = Math.round((Date.parse(`${day}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / DAY);
  const [year, month, date] = day.split("-").map(Number);
  const weekday = WEEKDAYS[new Date(Date.UTC(year, month - 1, date)).getUTCDay()];
  const short = `${weekday} ${date} ${MONTHS[month - 1]}${day.slice(0, 4) === today.slice(0, 4) ? "" : ` ${year}`}`;

  const relative =
    daysAway === 0 ? "Today"
    : daysAway === -1 ? "Yesterday"
    : daysAway === 1 ? "Tomorrow"
    : Math.abs(daysAway) < 7 ? (daysAway < 0 ? `${-daysAway} days ago` : `In ${daysAway} days`)
    : null;
  return relative ? `${relative}, ${short}` : short;
}

/** A moment as "Today, Wed 28 Oct, 14:30" in South African time. */
export function friendlyDateTime(timestamp: string, now = new Date()): string {
  return `${friendlyDate(timestamp, now)}, ${toLocalInput(new Date(timestamp)).slice(11, 16)}`;
}

/** A session as "Today, Wed 28 Oct, 14:30–15:15" in South African time. */
export function friendlySessionTime(startsAt: string, durationMinutes: number, now = new Date()): string {
  const end = toLocalInput(new Date(new Date(startsAt).getTime() + durationMinutes * 60 * 1000));
  return `${friendlyDateTime(startsAt, now)}–${end.slice(11, 16)}`;
}
