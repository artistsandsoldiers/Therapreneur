-- Sessions have a length, so they have an end time. Each practice sets its usual length, changeable per session.

alter table public.practices
  add column session_minutes integer not null default 45 check (session_minutes between 5 and 480);
grant update (session_minutes) on public.practices to authenticated;

alter table public.sessions
  add column duration_minutes integer not null default 45 check (duration_minutes between 5 and 480);

-- A claimed session's length is printed on its invoice, so it is locked with the date, patient and outcome.
create or replace function public.lock_claimed_session() returns trigger
language plpgsql set search_path = ''
as $$
begin
  if (tg_op = 'DELETE' or (new.patient_id, new.starts_at, new.duration_minutes, new.outcome)
        is distinct from (old.patient_id, old.starts_at, old.duration_minutes, old.outcome))
     and public.invoice_is_claimed((select id from public.invoices where session_id = old.id)) then
    raise exception 'This session''s invoice has been claimed, so only its note can change';
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

-- save_capture now takes the session's length. The older versions stay until a clean-up, so the live app keeps
-- working until this change is merged.

create function public.save_capture(
  p_session_id uuid,
  p_patient_id uuid,
  p_starts_at timestamptz,
  p_outcome public.session_outcome,
  p_note text,
  p_lines jsonb,
  p_bill_to public.bill_to,
  p_duration_minutes integer
) returns uuid
language plpgsql security invoker set search_path = ''
as $$
declare
  v_practice_id uuid := public.current_practice_id();
  v_patient public.patients;
  v_session_id uuid := p_session_id;
  v_invoice_id uuid;
  v_issued_on date := (p_starts_at at time zone 'Africa/Johannesburg')::date;
  v_bill_to public.bill_to;
begin
  if v_practice_id is null then
    raise exception 'Not linked to a practice';
  end if;
  if jsonb_array_length(p_lines) = 0 then
    raise exception 'An invoice needs at least one billing code';
  end if;

  select * into v_patient from public.patients where id = p_patient_id;
  if not found then
    raise exception 'Patient not found';
  end if;

  v_bill_to := case when p_outcome = 'no_show' then 'patient' else p_bill_to end;
  if v_bill_to = 'medical_aid' and v_patient.medical_aid_id is null then
    raise exception 'This patient has no medical aid';
  end if;

  if v_session_id is null then
    -- Lock the practice so two captures can't take the same invoice number.
    perform 1 from public.practices where id = v_practice_id for update;

    insert into public.sessions (practice_id, patient_id, starts_at, duration_minutes, outcome, note)
    values (v_practice_id, p_patient_id, p_starts_at, p_duration_minutes, p_outcome, nullif(trim(p_note), ''))
    returning id into v_session_id;

    insert into public.invoices (practice_id, session_id, number, issued_on, due_on, bill_to)
    values (
      v_practice_id,
      v_session_id,
      coalesce((select max(number) from public.invoices where practice_id = v_practice_id), 0) + 1,
      v_issued_on,
      v_issued_on + 30,
      v_bill_to
    )
    returning id into v_invoice_id;
  else
    update public.sessions
       set patient_id = p_patient_id, starts_at = p_starts_at, duration_minutes = p_duration_minutes, outcome = p_outcome,
           note = nullif(trim(p_note), '')
     where id = v_session_id;
    if not found then
      raise exception 'Session not found';
    end if;

    update public.invoices
       set issued_on = v_issued_on, due_on = v_issued_on + 30, bill_to = v_bill_to
     where session_id = v_session_id
    returning id into v_invoice_id;
    if v_invoice_id is null then
      raise exception 'Invoice not found';
    end if;
  end if;

  insert into public.invoice_lines (invoice_id, position, billing_code_id, code, description, icd10_codes, quantity, unit_price_cents)
  select v_invoice_id, line.position, code.id, code.code, code.description, v_patient.icd10_codes,
         (line.value ->> 'quantity')::integer, (line.value ->> 'unit_price_cents')::integer
    from jsonb_array_elements(p_lines) with ordinality as line (value, position)
    join public.billing_codes code on code.id = (line.value ->> 'billing_code_id')::uuid;

  if (select count(*) from public.invoice_lines where invoice_id = v_invoice_id) <> jsonb_array_length(p_lines) then
    raise exception 'Unknown billing code or old lines not cleared';
  end if;

  return v_invoice_id;
end;
$$;

revoke execute on function public.save_capture(uuid, uuid, timestamptz, public.session_outcome, text, jsonb, public.bill_to, integer) from public, anon;
grant execute on function public.save_capture(uuid, uuid, timestamptz, public.session_outcome, text, jsonb, public.bill_to, integer) to authenticated;
