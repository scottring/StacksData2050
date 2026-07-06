-- Retroactive migration: is_company_main_contact
--
-- This column was introduced earlier via setup-dev-schema.sql (dev) and
-- ad-hoc DDL applied to production, but never captured in a tracked
-- migration file. The 20260417000001_contacts_editable.sql migration
-- added an index on the column without adding the column itself.
--
-- This file restores schema-history completeness so a fresh environment
-- picks up the column. It uses IF NOT EXISTS for idempotency — dev and
-- prod already have the column, so this is a no-op there.

alter table public.users
  add column if not exists is_company_main_contact boolean default false;
