-- Referrers: who or what sent a patient to the practice, like a doctor, a website or social media.
-- A patient has at most one. A doctor referrer also fills the patient's referring doctor name and practice number,
-- which invoices and claims already print, so those columns stay as they are.

create type public.referrer_kind as enum ('doctor', 'therapist', 'website', 'social_media', 'word_of_mouth', 'other');

create table public.referrers (
  id uuid primary key default gen_random_uuid(),
  practice_id uuid not null references public.practices on delete cascade,
  name text not null check (char_length(name) between 1 and 100),
  kind public.referrer_kind not null,
  -- Only for doctors, printed on invoices.
  practice_number text check (char_length(practice_number) <= 30),
  created_at timestamptz not null default now()
);

create unique index referrers_unique_name on public.referrers (practice_id, lower(name));

alter table public.referrers enable row level security;

create policy "Practitioners manage their referrers" on public.referrers for all to authenticated
  using (practice_id = (select public.current_practice_id()))
  with check (practice_id = (select public.current_practice_id()));

alter table public.patients add column referrer_id uuid references public.referrers on delete set null;
create index patients_referrer_id on public.patients (referrer_id);

-- Every referring doctor typed so far becomes a doctor referrer, matched by name within the practice.
insert into public.referrers (practice_id, name, kind, practice_number)
select practice_id, min(trim(referring_doctor_name)), 'doctor', max(nullif(trim(referring_doctor_practice_number), ''))
  from public.patients
 where trim(coalesce(referring_doctor_name, '')) <> ''
 group by practice_id, lower(trim(referring_doctor_name));

update public.patients p
   set referrer_id = r.id
  from public.referrers r
 where r.practice_id = p.practice_id
   and lower(r.name) = lower(trim(p.referring_doctor_name));
