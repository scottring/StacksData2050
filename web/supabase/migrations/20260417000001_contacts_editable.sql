-- Editable contacts: add CRM fields, introduce has_logged_in lock flag
alter table public.users
  add column if not exists job_title text,
  add column if not exists has_logged_in boolean not null default false;

-- Backfill: anyone who has a non-placeholder email AND password_changed is true
-- was plausibly active in legacy Bubble; treat them as logged in to protect
-- their records.
update public.users
set has_logged_in = true
where password_changed = true
  and email is not null
  and email not ilike '%placeholder%';

create index if not exists users_company_id_is_main_contact_idx
  on public.users (company_id)
  where is_company_main_contact = true;
