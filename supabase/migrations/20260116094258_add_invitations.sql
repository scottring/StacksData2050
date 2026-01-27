-- Migration: Add Supplier Invitation System
-- Purpose: Enable customers to invite new suppliers who aren't yet in the system
-- Date: 2026-01-16

-- Invitations table for new supplier onboarding
CREATE TABLE invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  company_name TEXT,                                     -- Pre-filled suggestion for signup
  request_id UUID REFERENCES requests(id) ON DELETE SET NULL, -- Optional link to specific request
  token TEXT NOT NULL UNIQUE,                            -- Signup token for verification
  sent_at TIMESTAMP,                                     -- When invitation email was sent
  accepted_at TIMESTAMP,                                 -- When supplier completed signup
  expires_at TIMESTAMP DEFAULT (NOW() + INTERVAL '30 days'),
  created_by UUID REFERENCES users(id) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_invitations_email ON invitations(email);
CREATE INDEX idx_invitations_token ON invitations(token);
CREATE INDEX idx_invitations_request ON invitations(request_id);
CREATE INDEX idx_invitations_created_by ON invitations(created_by);
CREATE INDEX idx_invitations_accepted_at ON invitations(accepted_at);

-- RLS Policies for security
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;

-- Users can view invitations they created
CREATE POLICY "Users can view their own invitations"
  ON invitations FOR SELECT
  USING (created_by = auth.uid());

-- Users can create invitations for their company's requests
CREATE POLICY "Users can create invitations"
  ON invitations FOR INSERT
  WITH CHECK (created_by = auth.uid());

-- Users can update invitations they created
CREATE POLICY "Users can update their invitations"
  ON invitations FOR UPDATE
  USING (created_by = auth.uid());

-- Trigger for auto-updating updated_at timestamp
CREATE TRIGGER update_invitations_updated_at
  BEFORE UPDATE ON invitations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Comments for documentation
COMMENT ON TABLE invitations IS 'Tracks supplier invitations for new company onboarding';
COMMENT ON COLUMN invitations.email IS 'Email address of the invited supplier';
COMMENT ON COLUMN invitations.company_name IS 'Pre-filled company name suggestion for signup form';
COMMENT ON COLUMN invitations.token IS 'Unique signup token included in invitation email URL';
COMMENT ON COLUMN invitations.request_id IS 'Optional link to specific product data request that prompted invitation';
COMMENT ON COLUMN invitations.sent_at IS 'Timestamp when invitation email was successfully sent';
COMMENT ON COLUMN invitations.accepted_at IS 'Timestamp when supplier completed signup process';
COMMENT ON COLUMN invitations.expires_at IS 'Expiration date for invitation (default 30 days from creation)';
