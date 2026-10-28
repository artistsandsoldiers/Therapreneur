-- Reconciliation: a medical aid's remittance marks the claims it paid as paid in full. For now the practitioner ticks
-- the paid claims by hand. Shortfalls and rejections come later, so a remittance keeps its own row to hang them on.
create table public.remittances (
  id uuid primary key default gen_random_uuid(),
  practice_id uuid not null references public.practices on delete cascade,
  medical_aid_id uuid not null references public.medical_aids,
  paid_on date not null,
  reference text check (char_length(reference) <= 100),
  created_at timestamptz not null default now()
);

create index remittances_practice_id on public.remittances (practice_id);
create index remittances_medical_aid_id on public.remittances (medical_aid_id);

alter table public.remittances enable row level security;

create policy "Practitioners manage their remittances" on public.remittances for all to authenticated
  using (practice_id = (select public.current_practice_id()))
  with check (practice_id = (select public.current_practice_id()));

-- The remittance that paid an invoice. Empty for outstanding invoices and ones marked paid by hand.
alter table public.invoices add column remittance_id uuid references public.remittances on delete set null;
create index invoices_remittance_id on public.invoices (remittance_id);

-- A claimed invoice stays locked, except for whether and how it was paid.
create or replace function public.lock_claimed_invoice() returns trigger
language plpgsql set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' and (to_jsonb(new) - 'paid_on' - 'remittance_id') = (to_jsonb(old) - 'paid_on' - 'remittance_id') then
    return new;
  end if;
  if public.invoice_is_claimed(old.id) then
    raise exception 'Invoice % has been claimed and can''t be changed', old.number;
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

-- Records a remittance and marks its claims paid. Each invoice must be an outstanding claim sent to this medical aid.
create function public.record_remittance(p_medical_aid_id uuid, p_paid_on date, p_reference text, p_invoice_ids uuid[])
returns uuid
language plpgsql security invoker set search_path = ''
as $$
declare
  v_practice_id uuid := public.current_practice_id();
  v_remittance_id uuid;
  v_updated integer;
begin
  if v_practice_id is null then
    raise exception 'Not linked to a practice';
  end if;
  if coalesce(array_length(p_invoice_ids, 1), 0) = 0 then
    raise exception 'A remittance needs at least one claim';
  end if;

  insert into public.remittances (practice_id, medical_aid_id, paid_on, reference)
  values (v_practice_id, p_medical_aid_id, p_paid_on, nullif(trim(p_reference), ''))
  returning id into v_remittance_id;

  update public.invoices i
     set paid_on = p_paid_on, remittance_id = v_remittance_id
    from public.claim_batches b
   where i.id = any (p_invoice_ids)
     and b.id = i.claim_batch_id
     and b.sent_at is not null
     and b.medical_aid_id = p_medical_aid_id
     and i.paid_on is null;
  get diagnostics v_updated = row_count;

  if v_updated <> cardinality(array(select distinct unnest(p_invoice_ids))) then
    raise exception 'Some claims are already paid or weren''t sent to this medical aid';
  end if;

  return v_remittance_id;
end;
$$;

revoke execute on function public.record_remittance(uuid, date, text, uuid[]) from public, anon;
grant execute on function public.record_remittance(uuid, date, text, uuid[]) to authenticated;
