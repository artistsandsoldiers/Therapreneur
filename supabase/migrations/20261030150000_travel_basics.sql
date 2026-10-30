-- The travel logbook's foundations (docs/features/travel.md): where the practitioner lives and works, where patients
-- are seen, and the car used for work with its odometer readings. Trips are worked out from these later.

-- Work days start and end at home. Never printed on invoices.
alter table public.practices add column home_address text check (char_length(home_address) <= 300);
grant update (home_address) on public.practices to authenticated;

-- A place where the practitioner sees patients, like their rooms or a hospital. Regular places are their place of
-- work, so SARS counts driving there from home as private. A tax practitioner can mark one as not regular.
create table public.places (
  id uuid primary key default gen_random_uuid(),
  practice_id uuid not null references public.practices on delete cascade,
  name text not null check (char_length(name) between 1 and 60),
  address text not null check (char_length(address) between 1 and 300),
  regular boolean not null default true,
  created_at timestamptz not null default now()
);

create unique index places_unique_name on public.places (practice_id, lower(name));

alter table public.places enable row level security;

create policy "Practitioners manage their places" on public.places for all to authenticated
  using (practice_id = (select public.current_practice_id()))
  with check (practice_id = (select public.current_practice_id()));

-- Where a patient is usually seen: one of the practice's places, or at home. New sessions start there.
alter table public.patients
  add column home_address text check (char_length(home_address) <= 300),
  add column seen_at_home boolean not null default false,
  add column usual_place_id uuid references public.places on delete set null;

create index patients_usual_place_id on public.patients (usual_place_id);

-- The car used for work. One at a time: changing car ends the old one on the day the new one starts, so trips on
-- that day belong to the new car.
create table public.cars (
  id uuid primary key default gen_random_uuid(),
  practice_id uuid not null references public.practices on delete cascade,
  name text not null check (char_length(name) between 1 and 60),
  registration text check (char_length(registration) <= 20),
  started_on date not null,
  ended_on date check (ended_on > started_on),
  created_at timestamptz not null default now()
);

create unique index cars_one_current on public.cars (practice_id) where ended_on is null;

-- What the odometer showed on a day. The first and last readings of a tax year give the total km driven.
create table public.odometer_readings (
  id uuid primary key default gen_random_uuid(),
  practice_id uuid not null references public.practices on delete cascade,
  car_id uuid not null references public.cars on delete cascade,
  read_on date not null,
  km integer not null check (km between 0 and 9999999),
  created_at timestamptz not null default now(),
  unique (car_id, read_on)
);

alter table public.cars enable row level security;
alter table public.odometer_readings enable row level security;

create policy "Practitioners manage their cars" on public.cars for all to authenticated
  using (practice_id = (select public.current_practice_id()))
  with check (practice_id = (select public.current_practice_id()));

create policy "Practitioners manage their odometer readings" on public.odometer_readings for all to authenticated
  using (practice_id = (select public.current_practice_id()))
  with check (
    practice_id = (select public.current_practice_id())
    and exists (select 1 from public.cars c where c.id = car_id and c.practice_id = (select public.current_practice_id()))
  );

-- Starts using a car for work, with its odometer reading that day. If there's a current car, it ends that day with
-- its last reading, all in one go so the practice is never left with two cars or none.
create function public.start_car(
  p_started_on date,
  p_name text,
  p_registration text,
  p_km integer,
  p_old_car_km integer
) returns uuid
language plpgsql security invoker set search_path = ''
as $$
declare
  v_practice_id uuid := public.current_practice_id();
  v_old public.cars;
  v_car_id uuid;
begin
  if v_practice_id is null then
    raise exception 'Not linked to a practice';
  end if;

  select * into v_old from public.cars where practice_id = v_practice_id and ended_on is null for update;
  if found then
    if p_started_on <= v_old.started_on then
      raise exception 'A new car must start after the current one started';
    end if;
    if p_old_car_km is null then
      raise exception 'The old car needs its last odometer reading';
    end if;
    update public.cars set ended_on = p_started_on where id = v_old.id;
    insert into public.odometer_readings (practice_id, car_id, read_on, km)
    values (v_practice_id, v_old.id, p_started_on, p_old_car_km)
    on conflict (car_id, read_on) do update set km = excluded.km;
  end if;

  insert into public.cars (practice_id, name, registration, started_on)
  values (v_practice_id, p_name, nullif(trim(p_registration), ''), p_started_on)
  returning id into v_car_id;
  insert into public.odometer_readings (practice_id, car_id, read_on, km) values (v_practice_id, v_car_id, p_started_on, p_km);
  return v_car_id;
end;
$$;

revoke execute on function public.start_car(date, text, text, integer, integer) from public, anon;
grant execute on function public.start_car(date, text, text, integer, integer) to authenticated;
