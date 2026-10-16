-- Record who a request notification was sent to.
-- Written by /api/requests/notify (service role) once it resolves the
-- recipient, including the fallback to the supplier's main contact, and by
-- the request dialog for invitations to new suppliers.
-- Existing rows stay NULL (no backfill); the UI shows a dash for them.
-- No RLS change: the existing requests_select / requests_update policies
-- already cover new columns on this table.

ALTER TABLE public.requests ADD COLUMN IF NOT EXISTS recipient_email text;
ALTER TABLE public.requests ADD COLUMN IF NOT EXISTS recipient_name text;

COMMENT ON COLUMN public.requests.recipient_email IS 'Email address the request notification was sent to';
COMMENT ON COLUMN public.requests.recipient_name IS 'Name of the contact the request notification was sent to';
