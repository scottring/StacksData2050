-- Trial issues table for collecting feedback during trial
CREATE TABLE IF NOT EXISTS trial_issues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  reporter_email TEXT,
  status TEXT DEFAULT 'open',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  resolution_notes TEXT
);

-- RLS: Allow anyone to insert (for trial feedback)
ALTER TABLE trial_issues ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can report issues" ON trial_issues
  FOR INSERT WITH CHECK (true);

-- Only authenticated users can read (for admin)
CREATE POLICY "Authenticated users can read issues" ON trial_issues
  FOR SELECT TO authenticated USING (true);
