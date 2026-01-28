-- Fix invitations table for trial onboarding
-- 1. Add company_id column to link invitations to existing companies
ALTER TABLE invitations ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);

-- 2. Add RLS policy allowing anonymous users to validate invitation tokens
-- This is needed because the signup page queries invitations before the user is authenticated
CREATE POLICY "Public can validate invitation tokens"
  ON invitations FOR SELECT
  USING (accepted_at IS NULL AND expires_at > NOW());
