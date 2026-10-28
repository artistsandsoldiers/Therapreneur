-- The practice's logo, shown in the app's nav, on invoices and on claim PDFs. Empty means no logo.
alter table public.practices add column logo_path text;
grant update (logo_path) on public.practices to authenticated;

-- A private bucket of logos, one folder per practice: <practice id>/<file>. PNG or JPG, up to 1 MB.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('logos', 'logos', false, 1048576, array['image/png', 'image/jpeg']);

create policy "Practitioners manage their logo" on storage.objects for all to authenticated
  using (bucket_id = 'logos' and (storage.foldername(name))[1] = (select public.current_practice_id())::text)
  with check (bucket_id = 'logos' and (storage.foldername(name))[1] = (select public.current_practice_id())::text);
