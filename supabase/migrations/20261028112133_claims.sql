-- Claims: medical aid invoices emailed in claim batches, then locked.

-- What medical aids need to identify a patient, and who referred them.
alter table public.patients
  add column date_of_birth date,
  add column dependant_code text check (dependant_code ~ '^\d{2}$'),
  add column referring_doctor_name text,
  add column referring_doctor_practice_number text;

-- The practitioner's own registration number, which every claim must carry.
alter table public.practices add column hpcsa_number text;

-- Where each medical aid wants claims emailed. Unused while testing: every claim goes to the test inbox.
alter table public.medical_aids add column claims_email text;

-- One email to a medical aid carrying several claims. sent_at is empty while the email is going out.
create table public.claim_batches (
  id uuid primary key default gen_random_uuid(),
  practice_id uuid not null references public.practices on delete cascade,
  medical_aid_id uuid not null references public.medical_aids,
  sent_to text,
  sent_at timestamptz,
  reference_number text check (char_length(reference_number) <= 100),
  created_at timestamptz not null default now()
);

create index claim_batches_practice_id on public.claim_batches (practice_id);
create index claim_batches_medical_aid_id on public.claim_batches (medical_aid_id);

alter table public.claim_batches enable row level security;

create policy "Practitioners manage their claim batches" on public.claim_batches for all to authenticated
  using (practice_id = (select public.current_practice_id()))
  with check (practice_id = (select public.current_practice_id()));

-- A claimed invoice keeps the patient and medical aid details it was sent with, so later patient edits don't change it.
alter table public.invoices
  add column claim_batch_id uuid references public.claim_batches on delete set null,
  add column claimed_details jsonb;

create index invoices_claim_batch_id on public.invoices (claim_batch_id);

-- An invoice is claimed once its batch has been sent.
create function public.invoice_is_claimed(p_invoice_id uuid) returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.invoices i join public.claim_batches b on b.id = i.claim_batch_id
     where i.id = p_invoice_id and b.sent_at is not null
  )
$$;

-- Claimed invoices, their lines, and their session's date, patient and outcome can't change. The note can.
create function public.lock_claimed_invoice() returns trigger
language plpgsql set search_path = ''
as $$
begin
  if public.invoice_is_claimed(old.id) then
    raise exception 'Invoice % has been claimed and can''t be changed', old.number;
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

create function public.lock_claimed_invoice_lines() returns trigger
language plpgsql set search_path = ''
as $$
begin
  if public.invoice_is_claimed(coalesce(new.invoice_id, old.invoice_id)) then
    raise exception 'This invoice has been claimed and can''t be changed';
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

create function public.lock_claimed_session() returns trigger
language plpgsql set search_path = ''
as $$
begin
  if (tg_op = 'DELETE' or (new.patient_id, new.starts_at, new.outcome) is distinct from (old.patient_id, old.starts_at, old.outcome))
     and public.invoice_is_claimed((select id from public.invoices where session_id = old.id)) then
    raise exception 'This session''s invoice has been claimed, so only its note can change';
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

create trigger lock_claimed before update or delete on public.invoices
  for each row execute function public.lock_claimed_invoice();
create trigger lock_claimed before insert or update or delete on public.invoice_lines
  for each row execute function public.lock_claimed_invoice_lines();
create trigger lock_claimed before update or delete on public.sessions
  for each row execute function public.lock_claimed_session();

-- Starts a claim batch: checks each invoice is an unclaimed medical aid invoice for this medical aid, and copies the
-- patient's details onto it. The app then emails the batch, and sets sent_at, or deletes the batch if sending fails.
create function public.start_claim_batch(p_medical_aid_id uuid, p_invoice_ids uuid[]) returns uuid
language plpgsql security invoker set search_path = ''
as $$
declare
  v_practice_id uuid := public.current_practice_id();
  v_batch_id uuid;
  v_updated integer;
begin
  if v_practice_id is null then
    raise exception 'Not linked to a practice';
  end if;
  if coalesce(array_length(p_invoice_ids, 1), 0) = 0 then
    raise exception 'A claim batch needs at least one invoice';
  end if;

  insert into public.claim_batches (practice_id, medical_aid_id)
  values (v_practice_id, p_medical_aid_id)
  returning id into v_batch_id;

  update public.invoices i
     set claim_batch_id = v_batch_id,
         claimed_details = jsonb_build_object(
           'patient_name', p.first_name || ' ' || p.last_name,
           'date_of_birth', p.date_of_birth,
           'dependant_code', p.dependant_code,
           'medical_aid_name', aid.name,
           'plan', p.plan,
           'member_number', p.member_number,
           'main_member_name', p.main_member_name,
           'referring_doctor_name', p.referring_doctor_name,
           'referring_doctor_practice_number', p.referring_doctor_practice_number
         )
    from public.sessions s
    join public.patients p on p.id = s.patient_id
    join public.medical_aids aid on aid.id = p.medical_aid_id
   where i.id = any (p_invoice_ids)
     and s.id = i.session_id
     and i.claim_batch_id is null
     and i.bill_to = 'medical_aid'
     and p.medical_aid_id = p_medical_aid_id
     and p.date_of_birth is not null
     and p.dependant_code is not null;
  get diagnostics v_updated = row_count;

  if v_updated <> cardinality(array(select distinct unnest(p_invoice_ids))) then
    raise exception 'Some invoices are already claimed, not for this medical aid, or missing patient details';
  end if;

  return v_batch_id;
end;
$$;

revoke execute on function public.start_claim_batch(uuid, uuid[]) from public, anon;
grant execute on function public.start_claim_batch(uuid, uuid[]) to authenticated;
revoke execute on function public.invoice_is_claimed(uuid) from public, anon;
grant execute on function public.invoice_is_claimed(uuid) to authenticated;
