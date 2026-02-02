-- Trial Activity Events Table
-- Tracks user engagement during trial period

CREATE TABLE IF NOT EXISTS trial_activity_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  email VARCHAR(255) NOT NULL,
  event_type VARCHAR(50) NOT NULL,
  event_data JSONB DEFAULT '{}',
  page_path TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for querying by user
CREATE INDEX idx_trial_activity_user_id ON trial_activity_events(user_id);

-- Index for querying by email (for pre-signup tracking)
CREATE INDEX idx_trial_activity_email ON trial_activity_events(email);

-- Index for querying by event type
CREATE INDEX idx_trial_activity_event_type ON trial_activity_events(event_type);

-- Index for time-based queries
CREATE INDEX idx_trial_activity_created_at ON trial_activity_events(created_at DESC);

-- Composite index for user activity timeline
CREATE INDEX idx_trial_activity_user_timeline ON trial_activity_events(user_id, created_at DESC);

-- RLS policies
ALTER TABLE trial_activity_events ENABLE ROW LEVEL SECURITY;

-- Super admins can read all events
CREATE POLICY "Super admins can read trial activity"
  ON trial_activity_events
  FOR SELECT
  TO authenticated
  USING (public.is_super_admin());

-- Users can read their own events
CREATE POLICY "Users can read own trial activity"
  ON trial_activity_events
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Allow inserts from authenticated users (for their own events)
CREATE POLICY "Users can insert own trial activity"
  ON trial_activity_events
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Allow service role to insert any events (for server-side logging)
-- This is handled by using the service role key in API routes

-- Add helpful comment
COMMENT ON TABLE trial_activity_events IS 'Tracks user engagement and activity during trial period';
COMMENT ON COLUMN trial_activity_events.event_type IS 'Event types: login, page_view, sheet_viewed, sheet_created, answer_submitted, answer_updated, file_uploaded, export_downloaded';
COMMENT ON COLUMN trial_activity_events.event_data IS 'Additional context like sheet_id, question_id, etc.';
