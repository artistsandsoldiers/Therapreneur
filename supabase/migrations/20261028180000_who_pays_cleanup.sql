-- Clean-up after the who-pays and session length changes, once the app no longer uses the old pieces.
-- Removes patients.payer_type (now bill_to plus whether medical_aid_id is set), the trigger that kept it in step,
-- and the two older versions of save_capture.


begin;
drop trigger sync_payer_type on public.patients;
drop function public.sync_payer_type();

-- The old medical aid details check mentions payer_type, so it goes with the column; the same rule comes back without it.
alter table public.patients drop constraint patients_medical_aid_details;
alter table public.patients drop column payer_type;
drop type public.payer_type;
alter table public.patients
  add constraint patients_medical_aid_details check (
    medical_aid_id is null or (member_number is not null and main_member_name is not null)
  );

drop function public.save_capture(uuid, uuid, timestamptz, public.session_outcome, text, jsonb);
drop function public.save_capture(uuid, uuid, timestamptz, public.session_outcome, text, jsonb, public.bill_to);

commit;
