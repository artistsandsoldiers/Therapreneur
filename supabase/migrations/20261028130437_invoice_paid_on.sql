-- When an invoice was paid in full. Empty means outstanding. The practitioner sets it for now; reconciliation will
-- set it from a remittance later.
alter table public.invoices add column paid_on date;

-- A claimed invoice stays locked, except for marking it paid or unpaid.
create or replace function public.lock_claimed_invoice() returns trigger
language plpgsql set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' and (to_jsonb(new) - 'paid_on') = (to_jsonb(old) - 'paid_on') then
    return new;
  end if;
  if public.invoice_is_claimed(old.id) then
    raise exception 'Invoice % has been claimed and can''t be changed', old.number;
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;
