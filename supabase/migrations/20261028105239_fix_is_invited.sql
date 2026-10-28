-- The parameter "email" clashed with the practices.email column, so the check compared invites with the
-- practice's contact email and always said no. Qualify the parameter with the function name.
create or replace function public.is_invited(email text) returns boolean
language sql stable security definer set search_path = ''
as $$ select exists (select 1 from public.practices p where lower(p.invite_email) = lower(is_invited.email)) $$;
