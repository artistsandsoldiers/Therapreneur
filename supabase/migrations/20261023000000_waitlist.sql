-- Waitlist signups from the landing page.
-- Anyone may sign up; nobody can read the list through the public API.
create table public.waitlist (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  profession text,
  source text,
  created_at timestamptz not null default now(),
  constraint waitlist_email_format check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  constraint waitlist_email_length check (char_length(email) <= 254),
  constraint waitlist_profession_length check (char_length(profession) <= 100),
  constraint waitlist_source_length check (char_length(source) <= 200)
);

create unique index waitlist_email_unique on public.waitlist (lower(email));

alter table public.waitlist enable row level security;

create policy "Anyone can join the waitlist"
  on public.waitlist for insert
  to anon, authenticated
  with check (true);
