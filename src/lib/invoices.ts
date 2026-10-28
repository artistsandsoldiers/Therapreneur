/** How an invoice number reads on screen and paper, e.g. INV-0007. */
export function invoiceNumber(number: number): string {
  return `INV-${String(number).padStart(4, "0")}`;
}
