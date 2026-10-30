-- Driving distances for the travel logbook (docs/features/travel.md), typed once per pair of addresses and remembered.
-- Google Maps fills these in later. Addresses are kept lower case with single spaces and the pair sorted, so A to B
-- and B to A are one distance.
create table public.distances (
  id uuid primary key default gen_random_uuid(),
  practice_id uuid not null references public.practices on delete cascade,
  address_a text not null,
  address_b text not null,
  km numeric(6, 1) not null check (km > 0 and km < 2000),
  created_at timestamptz not null default now(),
  check (address_a < address_b),
  unique (practice_id, address_a, address_b)
);

alter table public.distances enable row level security;

create policy "Practitioners manage their distances" on public.distances for all to authenticated
  using (practice_id = (select public.current_practice_id()))
  with check (practice_id = (select public.current_practice_id()));

-- The cautious setting: until a tax practitioner says otherwise, driving from home straight to a patient's home is
-- private. Turning this on counts it as business.
alter table public.practices add column home_to_patient_business boolean not null default false;
grant update (home_to_patient_business) on public.practices to authenticated;
