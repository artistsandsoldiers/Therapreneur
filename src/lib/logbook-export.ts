import { formatDate } from "./dates";
import type { CarLogbook } from "./logbook-data";
import { stopLabel } from "./trips";

/**
 * A car's logbook as CSV for a tax practitioner and SARS: the car, its odometer readings in the tax year, then every
 * business trip with its date, from, to, reason and km. Anonymous leaves out patient names.
 */
export function logbookCsv(logbook: CarLogbook, options: { practiceName: string; year: number; anonymous: boolean }): string {
  const { car, trips, share } = logbook;
  const yearEnd = `${options.year + 1}-03-01`;
  const readings = car.readings.filter((r) => r.readOn >= `${options.year}-03-01` && r.readOn < yearEnd);

  const rows: (string | number)[][] = [
    ["Travel logbook", options.practiceName],
    ["Tax year", `1 March ${options.year} to end of February ${options.year + 1}`],
    ["Car", car.name],
    ["Registration", car.registration ?? ""],
    ["Used for work", `${formatDate(car.started_on)} to ${car.ended_on ? formatDate(car.ended_on) : "now"}`],
    [],
    ["Odometer readings"],
    ["Date", "Km"],
    ...readings.map((r) => [formatDate(r.readOn), r.km]),
    [],
    ["Business km between first and last readings", share.share === null ? "" : share.businessKm],
    ["Total km between first and last readings", share.totalKm ?? ""],
    ["Business share", share.share === null ? "" : `${Math.round(share.share * 1000) / 10}%`],
    [],
    ["Business trips"],
    ["Date", "From", "To", "Reason", "Km"],
    ...trips.map((trip) => [
      formatDate(trip.date),
      stopLabel(trip.from, options.anonymous),
      stopLabel(trip.to, options.anonymous),
      options.anonymous ? trip.anonymousReason : trip.reason,
      trip.km ?? "",
    ]),
    [],
    ["Total business km", Math.round(trips.reduce((total, trip) => total + (trip.km ?? 0), 0) * 10) / 10],
  ];
  return rows.map((row) => row.map(cell).join(",")).join("\r\n") + "\r\n";
}

/** Quotes a cell when it holds a comma, quote or line break, as spreadsheets expect. */
function cell(value: string | number): string {
  const text = String(value);
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}
