-- Trial Management System
-- Creates tables for trial batches and discovery responses

-- =====================================================
-- 1. Trial Batches Table (for grouping bulk invitations)
-- =====================================================
CREATE TABLE IF NOT EXISTS trial_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  total_count INTEGER DEFAULT 0,
  sent_count INTEGER DEFAULT 0,
  accepted_count INTEGER DEFAULT 0
);

-- RLS for trial_batches
ALTER TABLE trial_batches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can manage trial batches"
  ON trial_batches FOR ALL TO authenticated
  USING (public.is_super_admin() = true)
  WITH CHECK (public.is_super_admin() = true);

-- =====================================================
-- 2. Trial Discovery Responses Table
-- =====================================================
CREATE TABLE IF NOT EXISTS trial_discovery_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL,
  company_name VARCHAR(255),
  invitation_id UUID REFERENCES invitations(id),
  responded_at TIMESTAMPTZ DEFAULT NOW(),

  -- Initial Discovery Questions (5)
  motivation_interest TEXT,
  learning_goals TEXT,
  success_definition TEXT,
  impact_measurement TEXT,
  concerns_questions TEXT,

  -- Tracking timestamps
  trial_started_at TIMESTAMPTZ,
  trial_completed_at TIMESTAMPTZ,
  follow_up_sent_at TIMESTAMPTZ,
  follow_up_responded_at TIMESTAMPTZ,

  -- Friday Follow-up Questions (4)
  platform_experience TEXT,
  biggest_surprise TEXT,
  remaining_questions TEXT,
  likelihood_to_recommend INTEGER CHECK (likelihood_to_recommend BETWEEN 1 AND 10),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for faster email lookups
CREATE INDEX IF NOT EXISTS idx_trial_discovery_email ON trial_discovery_responses(email);

-- RLS for trial_discovery_responses
ALTER TABLE trial_discovery_responses ENABLE ROW LEVEL SECURITY;

-- Anyone can insert discovery responses (needed for pre-auth submission)
CREATE POLICY "Anyone can submit discovery responses"
  ON trial_discovery_responses FOR INSERT
  WITH CHECK (true);

-- Super admins can view all responses
CREATE POLICY "Super admins can view discovery responses"
  ON trial_discovery_responses FOR SELECT TO authenticated
  USING (public.is_super_admin() = true);

-- Users can update their own responses (for follow-up)
CREATE POLICY "Users can update own discovery responses"
  ON trial_discovery_responses FOR UPDATE TO authenticated
  USING (email = (SELECT email FROM auth.users WHERE id = auth.uid()));

-- =====================================================
-- 3. Add columns to invitations table for trial tracking
-- =====================================================
ALTER TABLE invitations ADD COLUMN IF NOT EXISTS invitation_type TEXT DEFAULT 'supplier';
ALTER TABLE invitations ADD COLUMN IF NOT EXISTS trial_batch_id UUID REFERENCES trial_batches(id);
ALTER TABLE invitations ADD COLUMN IF NOT EXISTS notes TEXT;

-- Index for filtering by invitation type
CREATE INDEX IF NOT EXISTS idx_invitations_type ON invitations(invitation_type);
CREATE INDEX IF NOT EXISTS idx_invitations_batch ON invitations(trial_batch_id);

-- =====================================================
-- 4. Update RLS policy for invitations to allow super admin full access
-- =====================================================
-- Drop existing policy if it exists, then recreate
DO $$
BEGIN
  DROP POLICY IF EXISTS "Super admins can manage all invitations" ON invitations;
EXCEPTION WHEN undefined_object THEN
  NULL;
END $$;

CREATE POLICY "Super admins can manage all invitations"
  ON invitations FOR ALL TO authenticated
  USING (public.is_super_admin() = true)
  WITH CHECK (public.is_super_admin() = true);

-- =====================================================
-- Comments
-- =====================================================
COMMENT ON TABLE trial_batches IS 'Groups bulk trial invitations for tracking and management';
COMMENT ON TABLE trial_discovery_responses IS 'Pre-trial discovery questions and Friday follow-up responses';
COMMENT ON COLUMN invitations.invitation_type IS 'Type of invitation: supplier (default) or trial';
COMMENT ON COLUMN invitations.trial_batch_id IS 'Links trial invitations to their batch for grouping';
