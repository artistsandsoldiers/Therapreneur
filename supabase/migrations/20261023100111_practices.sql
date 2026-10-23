-- One practice per practitioner. Each practice sees only its own data (decision 0006).

-- Barry creates a practice with invite_email. The practitioner's first login links them to it.
create table public.practices (
  id uuid primary key default gen_random_uuid(),
  invite_email text not null,
  practitioner_id uuid unique references auth.users on delete set null,
  name text,
  practice_number text,
  address text,
  phone text,
  email text,
  bank_name text,
  bank_account_holder text,
  bank_account_number text,
  bank_branch_code text,
  profession public.profession,
  -- Whole percent above (positive) or below (negative) the medical aid rate.
  price_adjustment_percent integer not null default 0 check (price_adjustment_percent between -50 and 100),
  no_show_price_cents integer check (no_show_price_cents >= 0),
  setup_completed_at timestamptz,
  created_at timestamptz not null default now()
);

create unique index practices_invite_email_unique on public.practices (lower(invite_email));

create function public.current_practice_id() returns uuid
language sql stable security definer set search_path = ''
as $$ select id from public.practices where practitioner_id = auth.uid() $$;

-- Lets the login page check an email before sending a code.
create function public.is_invited(email text) returns boolean
language sql stable security definer set search_path = ''
as $$ select exists (select 1 from public.practices where lower(invite_email) = lower(email)) $$;

-- Links the logged-in practitioner to the practice their email was invited to.
create function public.claim_practice() returns uuid
language sql security definer set search_path = ''
as $$
  update public.practices
     set practitioner_id = auth.uid()
   where practitioner_id is null
     and lower(invite_email) = lower(auth.jwt() ->> 'email')
  returning id
$$;

revoke execute on function public.current_practice_id() from public, anon;
revoke execute on function public.claim_practice() from public, anon;
grant execute on function public.current_practice_id() to authenticated;
grant execute on function public.claim_practice() to authenticated;
grant execute on function public.is_invited(text) to anon, authenticated;

alter table public.practices enable row level security;

create policy "Practitioners read their practice" on public.practices for select to authenticated
  using (practitioner_id = (select auth.uid()));
create policy "Practitioners update their practice" on public.practices for update to authenticated
  using (practitioner_id = (select auth.uid())) with check (practitioner_id = (select auth.uid()));

-- Practitioners can change their setup, but never who the practice belongs to.
revoke insert, update, delete on public.practices from anon, authenticated;
grant update (
  name, practice_number, address, phone, email,
  bank_name, bank_account_holder, bank_account_number, bank_branch_code,
  profession, price_adjustment_percent, no_show_price_cents, setup_completed_at
) on public.practices to authenticated;
