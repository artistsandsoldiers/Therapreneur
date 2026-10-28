-- Central billing codes and medical aid rates (decision 0008), plus the enums the app uses.
-- Every practitioner can read the central list, and nobody edits it through the API.

create type public.profession as enum ('occupational_therapy', 'physiotherapy', 'speech_therapy');
create type public.payer_type as enum ('medical_aid', 'cash');
create type public.session_outcome as enum ('attended', 'no_show');
create type public.bill_to as enum ('medical_aid', 'patient');

create table public.medical_aids (
  id uuid primary key default gen_random_uuid(),
  name text not null unique
);

create table public.billing_codes (
  id uuid primary key default gen_random_uuid(),
  profession public.profession not null,
  code text not null,
  description text not null,
  is_no_show boolean not null default false,
  unique (profession, code)
);

-- A null rate means the medical aid has no fixed amount, so the practitioner prices it when capturing.
create table public.medical_aid_rates (
  billing_code_id uuid not null references public.billing_codes on delete cascade,
  medical_aid_id uuid not null references public.medical_aids on delete cascade,
  rate_cents integer check (rate_cents >= 0),
  effective_from date not null,
  primary key (billing_code_id, medical_aid_id, effective_from)
);

create index medical_aid_rates_medical_aid_id on public.medical_aid_rates (medical_aid_id);

alter table public.medical_aids enable row level security;
alter table public.billing_codes enable row level security;
alter table public.medical_aid_rates enable row level security;

-- The central list is read-only through the API.
revoke insert, update, delete on public.medical_aids, public.billing_codes, public.medical_aid_rates from anon, authenticated;

create policy "Practitioners read medical aids" on public.medical_aids for select to authenticated using (true);
create policy "Practitioners read billing codes" on public.billing_codes for select to authenticated using (true);
create policy "Practitioners read medical aid rates" on public.medical_aid_rates for select to authenticated using (true);
