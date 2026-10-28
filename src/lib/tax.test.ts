import { describe, expect, it } from "vitest";
import {
  ageAtYearEnd,
  dueDates,
  estimateTax,
  incomeTax,
  medicalCredit,
  monthsUntil,
  parseTaxForm,
  roughly,
  taxTable,
  taxYearDates,
  taxYearOf,
  type TaxInput,
} from "./tax";

const table = taxTable(2026).table;
const rands = (r: number) => r * 100;

// Worked by hand from the 2026/27 tables.
describe("incomeTax", () => {
  it("taxes each band and takes off the primary rebate", () => {
    expect(incomeTax(rands(390_000), 40, table)).toEqual({
      beforeRebatesCents: rands(82_137), // 79,998 + 31% of 6,900
      rebatesCents: rands(17_820),
      afterRebatesCents: rands(64_317),
    });
    expect(incomeTax(rands(245_100), 40, table).beforeRebatesCents).toBe(rands(44_118)); // top of the 18% band
    expect(incomeTax(rands(2_000_000), 40, table).beforeRebatesCents).toBe(rands(666_339 + 54_630)); // 45% of 121,400
  });

  it("charges nothing up to the R99,000 threshold, and adds rebates from 65 and 75", () => {
    expect(incomeTax(rands(99_000), 40, table).afterRebatesCents).toBe(0);
    expect(incomeTax(rands(100_000), 40, table).afterRebatesCents).toBe(rands(180));
    expect(incomeTax(rands(200_000), 65, table).rebatesCents).toBe(rands(17_820 + 9_765));
    expect(incomeTax(rands(200_000), 75, table).rebatesCents).toBe(rands(17_820 + 9_765 + 3_249));
  });
});

describe("medicalCredit", () => {
  it("gives R376 a month for each of the first two people and R254 for each after", () => {
    expect(medicalCredit(0, table)).toBe(0);
    expect(medicalCredit(1, table)).toBe(rands(376 * 12));
    expect(medicalCredit(4, table)).toBe(rands((376 * 2 + 254 * 2) * 12));
  });
});

describe("dates", () => {
  it("names tax years by the year they start", () => {
    expect(taxYearOf("2026-10-28")).toBe(2026);
    expect(taxYearOf("2027-02-28")).toBe(2026);
    expect(taxYearOf("2027-03-01")).toBe(2027);
    expect(taxYearDates(2027)).toEqual({ start: "2027-03-01", end: "2028-02-29" });
  });

  it("moves a due date on a weekend back to the Friday", () => {
    expect(dueDates(2026)).toEqual({ first: "2026-08-31", second: "2027-02-26", "top-up": "2027-09-30" });
  });

  it("counts age on the last day of February", () => {
    expect(ageAtYearEnd("1962-02-28", 2026)).toBe(65);
    expect(ageAtYearEnd("1962-03-01", 2026)).toBe(64);
  });

  it("counts months until a due date", () => {
    expect(monthsUntil("2026-10-28", "2027-02-26")).toBe(4);
    expect(monthsUntil("2027-02-10", "2027-02-26")).toBe(1);
  });

  it("uses the latest table for a year we don't have yet", () => {
    expect(taxTable(2027)).toMatchObject({ exact: false, table: { year: 2026 } });
  });
});

const base: TaxInput = {
  year: 2026,
  today: "2026-10-28",
  recordsFrom: "2026-03-01",
  incomeBeforeCents: 0,
  expensesBeforeCents: 0,
  invoicedCents: 0,
  expensesCents: 0,
  profitOverrideCents: null,
  dateOfBirth: "1985-06-01",
  medicalAidMembers: 0,
  retirementAnnuityMonthlyCents: 0,
  otherIncome: [],
  lastTaxableIncomeCents: null,
  paidCents: 0,
};

describe("estimateTax", () => {
  it("works through the feature doc's example", () => {
    const estimate = estimateTax({
      ...base,
      profitOverrideCents: rands(420_000),
      retirementAnnuityMonthlyCents: rands(2_500),
      medicalAidMembers: 1,
      paidCents: rands(25_000),
    });
    expect(estimate).toMatchObject({
      taxableIncomeCents: rands(390_000),
      yearTaxCents: rands(59_805), // 64,317 less 4,512 medical credit
      provisionalCents: rands(59_805),
      next: { kind: "second", due: "2027-02-26", amountCents: rands(34_805), monthlyCents: 870_125 },
    });
  });

  it("stretches profit so far to a full year, counting her totals from before she joined", () => {
    // 1 March to 31 August is 184 of 365 days.
    const estimate = estimateTax({
      ...base,
      today: "2026-08-31",
      recordsFrom: "2026-07-01",
      incomeBeforeCents: rands(150_000),
      expensesBeforeCents: rands(20_000),
      invoicedCents: rands(60_000),
      expensesCents: rands(6_000),
    });
    expect(estimate.profitSoFarCents).toBe(rands(184_000));
    expect(estimate.daysSoFar).toBe(184);
    expect(estimate.businessProfitCents).toBe(rands(365_000));
    expect(estimate.next).toMatchObject({ kind: "first", due: "2026-08-31" });
    expect(estimate.next!.amountCents).toBe(Math.round(estimate.provisionalCents / 2));
  });

  it("uses the whole year once it's over, and asks for a top-up by 30 September", () => {
    const estimate = estimateTax({ ...base, today: "2027-05-01", invoicedCents: rands(300_000), paidCents: rands(10_000) });
    expect(estimate.daysSoFar).toBe(365);
    expect(estimate.businessProfitCents).toBe(rands(300_000));
    expect(estimate.next).toMatchObject({ kind: "top-up", due: "2027-09-30" });
    expect(estimateTax({ ...base, today: "2027-10-01" }).next).toBeNull();
  });

  it("takes off PAYE, exempts interest up to R23,800 and caps the retirement deduction at 27.5%", () => {
    const estimate = estimateTax({
      ...base,
      profitOverrideCents: rands(200_000),
      retirementAnnuityMonthlyCents: rands(10_000),
      otherIncome: [
        { kind: "salary", yearlyCents: rands(100_000), payeCents: rands(8_000) },
        { kind: "interest", yearlyCents: rands(30_000), payeCents: 0 },
      ],
    });
    expect(estimate.interestExemptCents).toBe(rands(23_800));
    // Income 306,200; 27.5% is 84,205, below the R120,000 paid in.
    expect(estimate.retirementDeductionCents).toBe(rands(84_205));
    expect(estimate.taxableIncomeCents).toBe(rands(221_995));
    expect(estimate.provisionalCents).toBe(estimate.yearTaxCents - rands(8_000));
  });

  it("never goes below zero for a loss, and the medical credit can't make tax negative", () => {
    const estimate = estimateTax({ ...base, profitOverrideCents: rands(-50_000), medicalAidMembers: 3 });
    expect(estimate).toMatchObject({ taxableIncomeCents: 0, yearTaxCents: 0, medicalCreditCents: 0, provisionalCents: 0 });
  });

  it("gives the penalty-safe total from last year's taxable income, up to R1 million", () => {
    const safe = estimateTax({ ...base, profitOverrideCents: rands(420_000), lastTaxableIncomeCents: rands(390_000), medicalAidMembers: 1 });
    expect(safe.penaltySafeCents).toBe(rands(59_805));
    const over = estimateTax({ ...base, profitOverrideCents: rands(1_200_000), lastTaxableIncomeCents: rands(900_000) });
    expect(over.penaltySafeCents).toBeNull();
  });
});

describe("parseTaxForm", () => {
  const form = (fields: Record<string, string>) => {
    const data = new FormData();
    for (const [name, value] of Object.entries(fields)) data.set(name, value);
    return data;
  };

  it("reads answers, treating blanks as none", () => {
    const parsed = parseTaxForm(
      form({ date_of_birth: "1985-06-01", medical_aid_members: "2", retirement_annuity_monthly: "1 500", salary: "", interest: "R2 000", paid: "" }),
    );
    expect(parsed).toEqual({
      ok: true,
      answers: {
        date_of_birth: "1985-06-01",
        income_before_cents: 0,
        expenses_before_cents: 0,
        medical_aid_members: 2,
        retirement_annuity_monthly_cents: 150_000,
        profit_override_cents: null,
        last_taxable_income_cents: null,
        otherIncome: [{ kind: "interest", yearlyCents: 200_000, payeCents: 0 }],
        payment: null,
      },
    });
  });

  it("refuses bad amounts, PAYE with no salary and a payment with no date", () => {
    expect(parseTaxForm(form({ rent: "lots" })).ok).toBe(false);
    expect(parseTaxForm(form({ paye: "500" })).ok).toBe(false);
    expect(parseTaxForm(form({ paid: "25000" })).ok).toBe(false);
    expect(parseTaxForm(form({ medical_aid_members: "1.5" })).ok).toBe(false);
  });
});

it("rounds to the nearest R100", () => {
  expect(roughly(870_125)).toBe(870_000);
});
