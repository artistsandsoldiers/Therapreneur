/**
 * Money is stored as whole cents to avoid floating-point rounding errors.
 * Formats cents as South African rands, e.g. 125000 -> "R1,250.00".
 */
export function formatRands(cents: number): string {
  if (!Number.isInteger(cents)) {
    throw new Error(`Expected whole cents, got ${cents}`);
  }
  const sign = cents < 0 ? "-" : "";
  const abs = Math.abs(cents);
  const rands = Math.floor(abs / 100).toLocaleString("en-US");
  const remainder = String(abs % 100).padStart(2, "0");
  return `${sign}R${rands}.${remainder}`;
}

/**
 * Parses what a practitioner types as a rand amount into whole cents, e.g. "R1 250,50" -> 125050.
 * Accepts a comma or a point as the decimal separator. Returns null if it isn't an amount.
 */
export function parseRands(input: string): number | null {
  let text = input.replace(/[R\s]/gi, "");
  // A comma followed by one or two digits at the end is a decimal comma; any other comma separates thousands.
  if (/,\d{1,2}$/.test(text) && !text.includes(".")) text = text.replace(/,(\d{1,2})$/, ".$1");
  text = text.replace(/,/g, "");
  const match = /^(\d+)(?:\.(\d{1,2}))?$/.exec(text);
  if (!match) return null;
  return Number(match[1]) * 100 + Number((match[2] ?? "").padEnd(2, "0"));
}
