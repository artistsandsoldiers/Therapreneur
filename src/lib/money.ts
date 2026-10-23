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
