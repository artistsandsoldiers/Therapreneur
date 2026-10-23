-- Barry wants name, email and occupation, all required.
alter table public.waitlist rename column profession to occupation;
alter table public.waitlist rename constraint waitlist_profession_length to waitlist_occupation_length;
alter table public.waitlist add column name text not null;
alter table public.waitlist alter column occupation set not null;
alter table public.waitlist add constraint waitlist_name_length check (char_length(name) between 1 and 200);
