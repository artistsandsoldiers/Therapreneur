-- The practitioner's own name, for the greeting on Home. Empty until they fill it in on setup or in Settings.

alter table public.practices
  add column first_name text,
  add column last_name text;
grant update (first_name, last_name) on public.practices to authenticated;
