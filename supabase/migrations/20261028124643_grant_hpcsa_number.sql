-- Practitioners can only update the practices columns they're granted. The claims migration added hpcsa_number without one.
grant update (hpcsa_number) on public.practices to authenticated;
