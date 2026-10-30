import { loadLogbook } from "@/lib/logbook-data";
import { logbookCsv } from "@/lib/logbook-export";
import { requireSetUpPractice } from "@/lib/practice";

/** One car's logbook for a tax year as a spreadsheet, with or without patient names. */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const year = Number(url.searchParams.get("year"));
  if (!Number.isInteger(year) || year < 2000) return new Response("Unknown tax year", { status: 400 });

  const { supabase, practice } = await requireSetUpPractice();
  const logbook = await loadLogbook(supabase, practice, `${year}-03-01`);
  const carLogbook = logbook.logbooks.find((l) => l.car.id === url.searchParams.get("car"));
  if (!carLogbook) return new Response("Unknown car", { status: 404 });

  const anonymous = url.searchParams.get("anonymous") === "1";
  const csv = logbookCsv(carLogbook, { practiceName: practice.name ?? "", year, anonymous });
  const name = `Logbook ${year}-${String(year + 1).slice(2)} ${carLogbook.car.name}${anonymous ? " (anonymous)" : ""}.csv`;
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${name.replace(/[^\w .()-]/g, "")}"`,
    },
  });
}
