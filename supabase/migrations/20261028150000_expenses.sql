-- Expenses with optional receipts (docs/features/expenses.md).

-- Expense categories: a central list we keep for every practice (no practice_id), plus each practice's own.
create table public.expense_categories (
  id uuid primary key default gen_random_uuid(),
  practice_id uuid references public.practices on delete cascade,
  name text not null check (char_length(name) between 1 and 60),
  -- A short example of what goes in it, for practitioners who know nothing about tax.
  hint text,
  position integer not null default 100,
  created_at timestamptz not null default now()
);

create unique index expense_categories_unique_name
  on public.expense_categories (coalesce(practice_id, '00000000-0000-0000-0000-000000000000'), lower(name));
create index expense_categories_practice_id on public.expense_categories (practice_id);

create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  practice_id uuid not null references public.practices on delete cascade,
  spent_on date not null,
  supplier text not null check (char_length(supplier) between 1 and 200),
  amount_cents integer not null check (amount_cents > 0),
  category_id uuid not null references public.expense_categories on delete restrict,
  note text check (char_length(note) <= 2000),
  -- Where the receipt is kept in the receipts bucket. Empty means no receipt yet.
  receipt_path text,
  created_at timestamptz not null default now()
);

create index expenses_practice_id_spent_on on public.expenses (practice_id, spent_on);
create index expenses_category_id on public.expenses (category_id);

alter table public.expense_categories enable row level security;
alter table public.expenses enable row level security;

-- Practitioners see the central categories and their own. They can add and rename their own, never delete one.
revoke insert, update, delete on public.expense_categories from anon, authenticated;
grant insert (practice_id, name) on public.expense_categories to authenticated;
grant update (name) on public.expense_categories to authenticated;

create policy "Practitioners read expense categories" on public.expense_categories for select to authenticated
  using (practice_id is null or practice_id = (select public.current_practice_id()));
create policy "Practitioners add their expense categories" on public.expense_categories for insert to authenticated
  with check (practice_id = (select public.current_practice_id()));
create policy "Practitioners rename their expense categories" on public.expense_categories for update to authenticated
  using (practice_id = (select public.current_practice_id()))
  with check (practice_id = (select public.current_practice_id()));

-- An expense's category must be a central one or the practice's own.
create policy "Practitioners manage their expenses" on public.expenses for all to authenticated
  using (practice_id = (select public.current_practice_id()))
  with check (
    practice_id = (select public.current_practice_id())
    and exists (
      select 1 from public.expense_categories c
      where c.id = category_id and (c.practice_id is null or c.practice_id = (select public.current_practice_id()))
    )
  );

insert into public.expense_categories (name, hint, position) values
  ('Rooms and rent', 'Rent for your rooms, or paying for space by the hour', 1),
  ('Therapy supplies', 'Things used up in sessions, like putty, splinting material and worksheets', 2),
  ('Equipment', 'Things that last, like a plinth, assessment kits or a laptop', 3),
  ('Professional fees', 'HPCSA, OTASA and malpractice cover', 4),
  ('Accounting and tax fees', 'Your bookkeeper or tax practitioner', 5),
  ('Software', 'Apps and subscriptions, like this one or Microsoft 365', 6),
  ('Phone and internet', 'Your cellphone contract, data and wifi', 7),
  ('Marketing and website', 'Your website, business cards and adverts', 8),
  ('Bank charges', 'Monthly fees and card machine charges on your business account', 9),
  ('Training and CPD', 'Courses, conferences and CPD points', 10),
  ('Vehicle costs', 'Fuel, services, tyres, insurance and licence for the car you use for work', 11),
  ('Other', 'Anything that doesn''t fit above', 12);

-- A private bucket of receipts, one folder per practice: <practice id>/<file>. Photos or PDFs, up to 10 MB.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('receipts', 'receipts', false, 10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif', 'application/pdf']);

create policy "Practitioners manage their receipts" on storage.objects for all to authenticated
  using (bucket_id = 'receipts' and (storage.foldername(name))[1] = (select public.current_practice_id())::text)
  with check (bucket_id = 'receipts' and (storage.foldername(name))[1] = (select public.current_practice_id())::text);
