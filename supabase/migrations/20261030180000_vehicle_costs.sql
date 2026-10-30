-- Vehicle costs count only their business share (docs/features/travel.md). Parking and tolls on business trips are
-- all business, so they get their own category.
alter table public.expense_categories add column business_share boolean not null default false;

update public.expense_categories
   set business_share = true,
       hint = 'Fuel, services, tyres, insurance, licence and finance interest for the car you use for work. Only your business share from the logbook counts.'
 where practice_id is null and name = 'Vehicle costs';

update public.expense_categories set position = 13 where practice_id is null and name = 'Other';

insert into public.expense_categories (name, hint, position) values
  ('Business parking and tolls', 'Parking and tolls on trips to patients, meetings and training. Counts in full.', 12);
