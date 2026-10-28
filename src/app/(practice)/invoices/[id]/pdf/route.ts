import { notFound } from "next/navigation";
import { loadInvoiceDocument } from "@/lib/invoice-document";
import { invoicePdfName, renderInvoicePdf } from "@/lib/invoice-pdf";
import { logoImage } from "@/lib/logo";
import { requireSetUpPractice } from "@/lib/practice";

/** Downloads the invoice as a PDF. */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, practice } = await requireSetUpPractice();
  const invoice = await loadInvoiceDocument(supabase, practice, id);
  if (!invoice) notFound();

  const pdf = await renderInvoicePdf(invoice, await logoImage(supabase, practice));
  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${invoicePdfName(invoice)}"`,
    },
  });
}
