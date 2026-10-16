-- Soft withdraw for sent requests (e.g. a request sent to the wrong supplier).
-- The request row, its sheet and any answers are kept; the app hides
-- withdrawn requests (and their sheets) from customer and supplier lists.
--
-- Set only by POST /api/requests/[id]/withdraw, which uses the service role
-- after checking the caller belongs to the requesting company
-- (requests.requestor_id). No RLS change: there is still no DELETE policy,
-- and the existing requests_select policy covers the new columns.
--
-- withdrawn_by holds a users.id but deliberately has no foreign key: a second
-- requests -> users FK would make existing PostgREST embeds of users from
-- requests (via requests_created_by_fkey) ambiguous.

ALTER TABLE public.requests ADD COLUMN IF NOT EXISTS withdrawn_at timestamptz;
ALTER TABLE public.requests ADD COLUMN IF NOT EXISTS withdrawn_by uuid;

COMMENT ON COLUMN public.requests.withdrawn_at IS 'When the requesting company withdrew this request; NULL means active';
COMMENT ON COLUMN public.requests.withdrawn_by IS 'users.id of the person who withdrew the request';
