-- A patient the practitioner no longer sees moves to past patients, for any reason. Null means current.
alter table public.patients add column past_since date;
