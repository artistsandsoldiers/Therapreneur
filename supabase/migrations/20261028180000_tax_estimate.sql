-- Provisional tax estimate on the Tax page (docs/features/tax.md). A practice turns it on by answering a few
-- questions once a tax year. Tax years are named by the year they start: 2026 is 1 March 2026 to 28 February 2027.

create type public.business_type as enum ('sole_proprietor', 'inc');
create type public.other_income_kind as enum ('salary', 'interest', 'rent', 'other');

alter table public.practices
  add column business_type public.business_type not null default 'sole_proprietor',
  -- The practitioner's own date of birth, for SARS's extra rebates from 65 and 75.
  add column date_of_birth date,
  add column tax_estimate_on boolean not null default false;

grant update (business_type, date_of_birth, tax_estimate_on) on public.practices to authenticated;

-- One practice's answers for one tax year.
create table public.tax_years (
  id uuid primary key default gen_random_uuid(),
  practice_id uuid not null references public.practices on delete cascade,
  tax_year integer not null check (tax_year between 2020 and 2100),
  -- Invoices and expenses count from this date. Before it, the practitioner's own rough totals stand in.
  records_from date not null,
  income_before_cents integer not null default 0 check (income_before_cents >= 0),
  expenses_before_cents integer not null default 0 check (expenses_before_cents >= 0),
  -- Everyone on the medical aid the practitioner pays for, herself included. 0 means none.
  medical_aid_members integer not null default 0 check (medical_aid_members between 0 and 20),
  retirement_annuity_monthly_cents integer not null default 0 check (retirement_annuity_monthly_cents >= 0),
  -- Her own figure for the whole year's business profit, used instead of ours when set.
  profit_override_cents integer,
  -- Taxable income on her last assessment (ITA34), for the penalty-safe line. Empty means not given.
  last_taxable_income_cents integer check (last_taxable_income_cents >= 0),
  created_at timestamptz not null default now(),
  unique (practice_id, tax_year)
);

create table public.tax_other_income (
  id uuid primary key default gen_random_uuid(),
  practice_id uuid not null references public.practices on delete cascade,
  tax_year integer not null,
  kind public.other_income_kind not null,
  description text check (char_length(description) <= 200),
  yearly_cents integer not null check (yearly_cents > 0),
  -- Tax an employer took off a salary (PAYE) over the year.
  paye_cents integer not null default 0 check (paye_cents >= 0),
  created_at timestamptz not null default now()
);

create index tax_other_income_practice_year on public.tax_other_income (practice_id, tax_year);

-- Provisional tax she has paid SARS, for the tax year it counts towards.
create table public.tax_payments (
  id uuid primary key default gen_random_uuid(),
  practice_id uuid not null references public.practices on delete cascade,
  tax_year integer not null,
  paid_on date not null,
  amount_cents integer not null check (amount_cents > 0),
  created_at timestamptz not null default now()
);

create index tax_payments_practice_year on public.tax_payments (practice_id, tax_year);

alter table public.tax_years enable row level security;
alter table public.tax_other_income enable row level security;
alter table public.tax_payments enable row level security;

create policy "Practitioners manage their tax years" on public.tax_years for all to authenticated
  using (practice_id = (select public.current_practice_id()))
  with check (practice_id = (select public.current_practice_id()));
create policy "Practitioners manage their other income" on public.tax_other_income for all to authenticated
  using (practice_id = (select public.current_practice_id()))
  with check (practice_id = (select public.current_practice_id()));
create policy "Practitioners manage their tax payments" on public.tax_payments for all to authenticated
  using (practice_id = (select public.current_practice_id()))
  with check (practice_id = (select public.current_practice_id()));
