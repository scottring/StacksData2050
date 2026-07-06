-- DEV-GRADE MIGRATION. Aligns notifications with the NotificationBell component contract.
-- Prod also lacks these columns (verified 2026-07-06); apply at cutover after review.
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS type text;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS title text;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS message text;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS link text;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS read boolean NOT NULL DEFAULT false;

-- Legacy column predating the NotificationBell contract: `event_type` is NOT NULL
-- with no default (verified via information_schema on dev) and nothing in the
-- codebase reads or writes it (grep confirmed dead). It blocks every insert
-- from createNotificationsForCompany, which only knows the five bell columns.
-- Relax the constraint rather than drop the column, since prod carries the
-- same legacy shape and this stays reviewable/reversible at cutover.
ALTER TABLE notifications ALTER COLUMN event_type DROP NOT NULL;

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS notifications_select_own ON notifications;
CREATE POLICY notifications_select_own ON notifications FOR SELECT USING (user_id = auth.uid());
DROP POLICY IF EXISTS notifications_update_own ON notifications;
CREATE POLICY notifications_update_own ON notifications FOR UPDATE USING (user_id = auth.uid());

-- Realtime for the bell's INSERT subscription (idempotent guard)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'notifications'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
  END IF;
END $$;
