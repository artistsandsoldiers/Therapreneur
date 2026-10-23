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
