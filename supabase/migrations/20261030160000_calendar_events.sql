-- Where each session happens, and calendar events that aren't sessions (docs/features/travel.md). Both make trips.

-- A session is at one of the practice's places or at the patient's home. Places with sessions can't be deleted, so
-- the logbook never loses where a trip went.
alter table public.sessions
  add column place_id uuid references public.places on delete restrict,
  add column at_patient_home boolean not null default false;

create index sessions_place_id on public.sessions (place_id);

-- Every way of adding a session (booking or capture) starts it where the patient is usually seen.
create function public.session_default_place() returns trigger
language plpgsql set search_path = ''
as $$
begin
  if new.place_id is null and not new.at_patient_home then
    select p.usual_place_id, p.seen_at_home into new.place_id, new.at_patient_home
      from public.patients p where p.id = new.patient_id;
    new.at_patient_home := coalesce(new.at_patient_home, false);
  end if;
  return new;
end;
$$;

create trigger default_place before insert on public.sessions
  for each row execute function public.session_default_place();

-- Sessions already booked start where their patient is usually seen.
update public.sessions s
   set place_id = p.usual_place_id, at_patient_home = p.seen_at_home
  from public.patients p
 where p.id = s.patient_id and s.place_id is null and not s.at_patient_home;

-- Something in the calendar that isn't a session: a meeting, training, errand or other work. It happens at one of the
-- practice's places or at an address, and makes trips but never an invoice.
create type public.event_kind as enum ('meeting', 'training', 'errand', 'other');

create table public.events (
  id uuid primary key default gen_random_uuid(),
  practice_id uuid not null references public.practices on delete cascade,
  kind public.event_kind not null,
  title text check (char_length(title) <= 100),
  starts_at timestamptz not null,
  duration_minutes integer not null check (duration_minutes between 5 and 720),
  place_id uuid references public.places on delete restrict,
  address text check (char_length(address) between 1 and 300),
  created_at timestamptz not null default now(),
  check ((place_id is null) <> (address is null))
);

create index events_practice_id_starts_at on public.events (practice_id, starts_at);
create index events_place_id on public.events (place_id);

alter table public.events enable row level security;

create policy "Practitioners manage their events" on public.events for all to authenticated
  using (practice_id = (select public.current_practice_id()))
  with check (practice_id = (select public.current_practice_id()));
