-- Automatic reminders for open supplier requests.
-- Written only by the reminder sender (service role): the daily cron at
-- /api/cron/reminders and the manual POST /api/sheets/[id]/remind.
-- No RLS change: the existing requests_select policy covers new columns.
ALTER TABLE public.requests ADD COLUMN IF NOT EXISTS last_reminder_at timestamptz;
ALTER TABLE public.requests ADD COLUMN IF NOT EXISTS reminder_count integer NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.requests.last_reminder_at IS 'When the supplier was last reminded about this open request';
COMMENT ON COLUMN public.requests.reminder_count IS 'How many reminders have been sent for this request';
