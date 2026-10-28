/**
 * Provisional tax estimate (docs/features/tax.md) for a sole proprietor. All amounts are whole cents.
 *
 * Tax years are named by the year they start: 2026 is 1 March 2026 to 28 February 2027. The estimate is deliberately
 * simple and errs high: every expense counts, profit so far is stretched to a full year in a straight line, and the
 * extra medical expenses credit, capital gains, donations and wear-and-tear are left out.
 */
import { parseRands } from "./money";

const R = 100; // cents in a rand

export type TaxTable = {
  /** The tax year it applies to. */
  year: number;
  /** Each band: tax is `baseCents` plus `percent` of taxable income above `fromCents`. */
  brackets: { fromCents: number; baseCents: number; percent: number }[];
  rebates: { primaryCents: number; from65Cents: number; from75Cents: number };
  /** Monthly medical scheme fees credit: for each of the first two people, and each person after that. */
  medicalCredit: { firstTwoCents: number; otherCents: number };
  interestExemption: { under65Cents: number; from65Cents: number };
  retirement: { percent: number; capCents: number };
};

// 2026/27, from the Budget of 25 February 2026. Sources are in the feature doc. Add each new year's table here.
const TABLES: TaxTable[] = [
  {
    year: 2026,
    brackets: [
      { fromCents: 0, baseCents: 0, percent: 18 },
      { fromCents: 245_100 * R, baseCents: 44_118 * R, percent: 26 },
      { fromCents: 383_100 * R, baseCents: 79_998 * R, percent: 31 },
      { fromCents: 530_200 * R, baseCents: 125_599 * R, percent: 36 },
      { fromCents: 695_800 * R, baseCents: 185_215 * R, percent: 39 },
      { fromCents: 887_000 * R, baseCents: 259_783 * R, percent: 41 },
      { fromCents: 1_878_600 * R, baseCents: 666_339 * R, percent: 45 },
    ],
    rebates: { primaryCents: 17_820 * R, from65Cents: 9_765 * R, from75Cents: 3_249 * R },
    medicalCredit: { firstTwoCents: 376 * R, otherCents: 254 * R },
    interestExemption: { under65Cents: 23_800 * R, from65Cents: 34_500 * R },
    retirement: { percent: 27.5, capCents: 430_000 * R },
  },
];

/** The table for a tax year, or the latest one we have, with `exact` false until the new year's table is added. */
export function taxTable(year: number): { table: TaxTable; exact: boolean } {
  const exact = TABLES.find((t) => t.year === year);
  if (exact) return { table: exact, exact: true };
  const earlier = TABLES.filter((t) => t.year < year).sort((a, b) => b.year - a.year);
  return { table: earlier[0] ?? TABLES[0], exact: false };
}

/** The tax year a date (YYYY-MM-DD) falls in. */
export function taxYearOf(date: string): number {
  const year = Number(date.slice(0, 4));
  return Number(date.slice(5, 7)) >= 3 ? year : year - 1;
}

/** First and last day of a tax year, as YYYY-MM-DD. */
export function taxYearDates(year: number): { start: string; end: string } {
  return { start: `${year}-03-01`, end: iso(new Date(Date.UTC(year + 1, 2, 0))) };
}

/** "2026/27" */
export function taxYearName(year: number): string {
  return `${year}/${String(year + 1).slice(2)}`;
}

/** Age on the last day of the tax year, which is the age SARS uses for the extra rebates. */
export function ageAtYearEnd(dateOfBirth: string, year: number): number {
  const end = taxYearDates(year).end;
  const age = Number(end.slice(0, 4)) - Number(dateOfBirth.slice(0, 4));
  return end.slice(5) < dateOfBirth.slice(5) ? age - 1 : age;
}

/** Income tax on a year's taxable income, after the age rebates. Never below zero. */
export function incomeTax(taxableCents: number, age: number, table: TaxTable): { beforeRebatesCents: number; rebatesCents: number; afterRebatesCents: number } {
  const taxable = Math.max(0, taxableCents);
  const band = [...table.brackets].reverse().find((b) => taxable > b.fromCents) ?? table.brackets[0];
  const beforeRebatesCents = band.baseCents + Math.round(((taxable - band.fromCents) * band.percent) / 100);
  const { primaryCents, from65Cents, from75Cents } = table.rebates;
  const rebatesCents = primaryCents + (age >= 65 ? from65Cents : 0) + (age >= 75 ? from75Cents : 0);
  return { beforeRebatesCents, rebatesCents, afterRebatesCents: Math.max(0, beforeRebatesCents - rebatesCents) };
}

/** A year's medical scheme fees credit for everyone on the medical aid the practitioner pays for. */
export function medicalCredit(members: number, table: TaxTable): number {
  const { firstTwoCents, otherCents } = table.medicalCredit;
  const monthly = Math.min(members, 2) * firstTwoCents + Math.max(0, members - 2) * otherCents;
  return monthly * 12;
}

export type PaymentKind = "first" | "second" | "top-up";

/** SARS's due dates for a tax year. One that falls on a weekend moves back to the Friday before. */
export function dueDates(year: number): Record<PaymentKind, string> {
  return {
    first: workday(`${year}-08-31`),
    second: workday(taxYearDates(year).end),
    "top-up": workday(`${year + 1}-09-30`),
  };
}

function workday(date: string): string {
  const day = new Date(`${date}T00:00:00Z`);
  const weekday = day.getUTCDay();
  if (weekday === 6) day.setUTCDate(day.getUTCDate() - 1);
  if (weekday === 0) day.setUTCDate(day.getUTCDate() - 2);
  return iso(day);
}

/** Whole months from today's month to the due date's month, at least 1. October to February is 4. */
export function monthsUntil(today: string, due: string): number {
  const months = (date: string) => Number(date.slice(0, 4)) * 12 + Number(date.slice(5, 7));
  return Math.max(1, months(due) - months(today));
}

export type OtherIncome = { kind: "salary" | "interest" | "rent" | "other"; yearlyCents: number; payeCents: number };

export type TaxInput = {
  year: number;
  today: string; // YYYY-MM-DD
  /** Invoices and expenses in the app count from this date; the practitioner's own totals cover the time before. */
  recordsFrom: string;
  incomeBeforeCents: number;
  expensesBeforeCents: number;
  /** Invoiced (by invoice date) and spent in the app, from recordsFrom to the end of the tax year. */
  invoicedCents: number;
  expensesCents: number;
  profitOverrideCents: number | null;
  dateOfBirth: string | null;
  medicalAidMembers: number;
  retirementAnnuityMonthlyCents: number;
  otherIncome: OtherIncome[];
  lastTaxableIncomeCents: number | null;
  /** Provisional tax already paid towards this tax year. */
  paidCents: number;
};

export type TaxEstimate = {
  age: number | null;
  tableExact: boolean;
  profitSoFarCents: number;
  /** Days of the tax year so far, out of daysInYear. Equal once the year is over. */
  daysSoFar: number;
  daysInYear: number;
  /** The whole year's business profit: profit so far stretched to a year, or her own figure. */
  businessProfitCents: number;
  usedOverride: boolean;
  otherIncomeCents: number;
  interestExemptCents: number;
  retirementDeductionCents: number;
  taxableIncomeCents: number;
  taxBeforeRebatesCents: number;
  rebatesCents: number;
  medicalCreditCents: number;
  /** Income tax for the whole year, after rebates and credits. */
  yearTaxCents: number;
  payeCents: number;
  /** What provisional tax should cover for the year: the year's tax less PAYE. */
  provisionalCents: number;
  paidCents: number;
  /** The next payment due for this tax year, or null once the top-up date has passed. */
  next: { kind: PaymentKind; due: string; amountCents: number; monthlyCents: number } | null;
  /**
   * Total provisional tax for the year based on last year's taxable income (the basic amount). An estimate at least
   * that high can't draw SARS's underestimation penalty. Null if not given, or when taxable income is over R1 million,
   * where the safe line doesn't apply.
   */
  penaltySafeCents: number | null;
};

const PENALTY_SAFE_LIMIT_CENTS = 1_000_000 * R;

export function estimateTax(input: TaxInput): TaxEstimate {
  const { table, exact } = taxTable(input.year);
  const { start, end } = taxYearDates(input.year);
  const age = input.dateOfBirth ? ageAtYearEnd(input.dateOfBirth, input.year) : null;
  const from65 = age !== null && age >= 65;

  const daysInYear = days(start, end);
  const daysSoFar = Math.min(daysInYear, Math.max(1, days(start, input.today)));
  const profitSoFarCents =
    input.incomeBeforeCents - input.expensesBeforeCents + input.invoicedCents - input.expensesCents;
  const usedOverride = input.profitOverrideCents !== null;
  const businessProfitCents = input.profitOverrideCents ?? Math.round((profitSoFarCents * daysInYear) / daysSoFar);

  const interest = sum(input.otherIncome.filter((i) => i.kind === "interest").map((i) => i.yearlyCents));
  const interestExemptCents = Math.min(interest, from65 ? table.interestExemption.from65Cents : table.interestExemption.under65Cents);
  const otherIncomeCents = sum(input.otherIncome.map((i) => i.yearlyCents));
  const incomeCents = businessProfitCents + otherIncomeCents - interestExemptCents;

  const retirementDeductionCents = Math.max(
    0,
    Math.min(
      input.retirementAnnuityMonthlyCents * 12,
      Math.round((Math.max(0, incomeCents) * table.retirement.percent) / 100),
      table.retirement.capCents,
    ),
  );
  const taxableIncomeCents = Math.max(0, incomeCents - retirementDeductionCents);

  const tax = incomeTax(taxableIncomeCents, age ?? 0, table);
  const medical = medicalCredit(input.medicalAidMembers, table);
  const medicalCreditCents = Math.min(medical, tax.afterRebatesCents);
  const yearTaxCents = tax.afterRebatesCents - medicalCreditCents;
  const payeCents = sum(input.otherIncome.map((i) => i.payeCents));
  const provisionalCents = Math.max(0, yearTaxCents - payeCents);

  const dates = dueDates(input.year);
  const kind: PaymentKind | null =
    input.today <= dates.first ? "first" : input.today <= dates.second ? "second" : input.today <= dates["top-up"] ? "top-up" : null;
  const target = kind === "first" ? Math.round(provisionalCents / 2) : provisionalCents;
  const amountCents = Math.max(0, target - input.paidCents);
  const next = kind
    ? { kind, due: dates[kind], amountCents, monthlyCents: Math.ceil(amountCents / monthsUntil(input.today, dates[kind])) }
    : null;

  let penaltySafeCents: number | null = null;
  if (input.lastTaxableIncomeCents !== null && taxableIncomeCents <= PENALTY_SAFE_LIMIT_CENTS) {
    const safe = incomeTax(input.lastTaxableIncomeCents, age ?? 0, table).afterRebatesCents;
    penaltySafeCents = Math.max(0, safe - Math.min(medical, safe) - payeCents);
  }

  return {
    age,
    tableExact: exact,
    profitSoFarCents,
    daysSoFar,
    daysInYear,
    businessProfitCents,
    usedOverride,
    otherIncomeCents,
    interestExemptCents,
    retirementDeductionCents,
    taxableIncomeCents,
    taxBeforeRebatesCents: tax.beforeRebatesCents,
    rebatesCents: tax.rebatesCents,
    medicalCreditCents,
    yearTaxCents,
    payeCents,
    provisionalCents,
    paidCents: input.paidCents,
    next,
    penaltySafeCents,
  };
}

export type TaxAnswers = {
  date_of_birth: string | null;
  income_before_cents: number;
  expenses_before_cents: number;
  medical_aid_members: number;
  retirement_annuity_monthly_cents: number;
  profit_override_cents: number | null;
  last_taxable_income_cents: number | null;
  otherIncome: OtherIncome[];
  /** A payment already made this tax year, asked for only on the first setup. */
  payment: { paid_on: string; amount_cents: number } | null;
};

/** Reads and checks the tax questions. Blank amounts mean none. */
export function parseTaxForm(form: FormData): { ok: true; answers: TaxAnswers } | { ok: false; error: string } {
  const text = (name: string) => String(form.get(name) ?? "").trim();
  const amount = (name: string, what: string): number | null | Error => {
    if (!text(name)) return null;
    const cents = parseRands(text(name));
    return cents === null ? new Error(`Please enter ${what} in rands, like 1 250 or 0.`) : cents;
  };
  const isDate = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value));

  const dateOfBirth = text("date_of_birth");
  if (dateOfBirth && !isDate(dateOfBirth)) return { ok: false, error: "Please enter your date of birth." };

  const members = text("medical_aid_members") ? Number(text("medical_aid_members")) : 0;
  if (!Number.isInteger(members) || members < 0 || members > 20) {
    return { ok: false, error: "Please enter how many people are on your medical aid, as a whole number." };
  }

  const amounts = {
    income_before: amount("income_before", "what you invoiced before"),
    expenses_before: amount("expenses_before", "what you spent before"),
    retirement: amount("retirement_annuity_monthly", "your monthly retirement annuity"),
    override: amount("profit_override", "your own profit figure"),
    last_taxable: amount("last_taxable_income", "last year's taxable income"),
    salary: amount("salary", "your salary for the year"),
    paye: amount("paye", "the PAYE taken off your salary"),
    interest: amount("interest", "your interest for the year"),
    rent: amount("rent", "your rent income for the year"),
    other: amount("other_income", "your other income for the year"),
    paid: amount("paid", "what you've paid SARS"),
  };
  for (const value of Object.values(amounts)) if (value instanceof Error) return { ok: false, error: value.message };
  const cents = (key: keyof typeof amounts) => amounts[key] as number | null;

  const otherIncome: OtherIncome[] = [];
  if (cents("salary") || cents("paye")) {
    if (!cents("salary")) return { ok: false, error: "Please enter the salary the PAYE was taken from." };
    otherIncome.push({ kind: "salary", yearlyCents: cents("salary")!, payeCents: cents("paye") ?? 0 });
  }
  for (const kind of ["interest", "rent", "other"] as const) {
    const value = cents(kind);
    if (value) otherIncome.push({ kind, yearlyCents: value, payeCents: 0 });
  }

  let payment: TaxAnswers["payment"] = null;
  if (cents("paid")) {
    const paidOn = text("paid_on");
    if (!isDate(paidOn)) return { ok: false, error: "Please enter the date you paid SARS." };
    payment = { paid_on: paidOn, amount_cents: cents("paid")! };
  }

  return {
    ok: true,
    answers: {
      date_of_birth: dateOfBirth || null,
      income_before_cents: cents("income_before") ?? 0,
      expenses_before_cents: cents("expenses_before") ?? 0,
      medical_aid_members: members,
      retirement_annuity_monthly_cents: cents("retirement") ?? 0,
      profit_override_cents: cents("override"),
      last_taxable_income_cents: cents("last_taxable"),
      otherIncome,
      payment,
    },
  };
}

/** Rounds to the nearest R100, for "about" figures. */
export function roughly(cents: number): number {
  return Math.round(cents / (100 * R)) * 100 * R;
}

function days(from: string, to: string): number {
  return Math.round((Date.parse(to) - Date.parse(from)) / 86_400_000) + 1;
}

function iso(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function sum(cents: number[]): number {
  return cents.reduce((total, c) => total + c, 0);
}
