-- A practice's patients, sessions and invoices. Row level security keeps them to that practice.

create table public.patients (
  id uuid primary key default gen_random_uuid(),
  practice_id uuid not null references public.practices on delete cascade,
  first_name text not null check (char_length(first_name) between 1 and 100),
  last_name text not null check (char_length(last_name) between 1 and 100),
  payer_type public.payer_type not null,
  medical_aid_id uuid references public.medical_aids,
  plan text,
  member_number text,
  main_member_name text,
  icd10_codes text[] not null default '{}',
  created_at timestamptz not null default now(),
  constraint patients_medical_aid_details check (
    payer_type = 'cash' or (medical_aid_id is not null and member_number is not null and main_member_name is not null)
  )
);

create table public.sessions (
  id uuid primary key default gen_random_uuid(),
  practice_id uuid not null references public.practices on delete cascade,
  patient_id uuid not null references public.patients on delete restrict,
  starts_at timestamptz not null,
  outcome public.session_outcome not null,
  note text check (char_length(note) <= 20000),
  created_at timestamptz not null default now()
);

create table public.invoices (
  id uuid primary key default gen_random_uuid(),
  practice_id uuid not null references public.practices on delete cascade,
  session_id uuid not null unique references public.sessions on delete cascade,
  number integer not null,
  issued_on date not null,
  due_on date not null,
  bill_to public.bill_to not null,
  created_at timestamptz not null default now(),
  unique (practice_id, number)
);

-- Code and description are copied onto the line, so later changes to the central list never alter an invoice.
create table public.invoice_lines (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.invoices on delete cascade,
  position integer not null,
  billing_code_id uuid references public.billing_codes on delete set null,
  code text not null,
  description text not null,
  icd10_codes text[] not null default '{}',
  quantity integer not null check (quantity between 1 and 99),
  unit_price_cents integer not null check (unit_price_cents >= 0)
);

create index patients_practice_id on public.patients (practice_id);
create index sessions_practice_id on public.sessions (practice_id);
create index sessions_patient_id on public.sessions (patient_id);
create index invoices_practice_id on public.invoices (practice_id);
create index invoice_lines_invoice_id on public.invoice_lines (invoice_id);
create index invoice_lines_billing_code_id on public.invoice_lines (billing_code_id);
create index patients_medical_aid_id on public.patients (medical_aid_id);


alter table public.patients enable row level security;
alter table public.sessions enable row level security;
alter table public.invoices enable row level security;
alter table public.invoice_lines enable row level security;

create policy "Practitioners manage their patients" on public.patients for all to authenticated
  using (practice_id = (select public.current_practice_id()))
  with check (practice_id = (select public.current_practice_id()));
create policy "Practitioners manage their sessions" on public.sessions for all to authenticated
  using (practice_id = (select public.current_practice_id()))
  with check (practice_id = (select public.current_practice_id()));
create policy "Practitioners manage their invoices" on public.invoices for all to authenticated
  using (practice_id = (select public.current_practice_id()))
  with check (practice_id = (select public.current_practice_id()));
create policy "Practitioners manage their invoice lines" on public.invoice_lines for all to authenticated
  using (exists (select 1 from public.invoices i where i.id = invoice_id and i.practice_id = (select public.current_practice_id())))
  with check (exists (select 1 from public.invoices i where i.id = invoice_id and i.practice_id = (select public.current_practice_id())));
