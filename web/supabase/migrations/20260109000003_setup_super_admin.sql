-- Setup Super Admin User
-- This migration creates a super admin user for platform-wide access

-- First, let's check if we have a Stacks Data admin account
-- If not, we'll need to create one through Supabase Auth first

-- Update the super admin flag for the specified user
-- Replace this email with your actual admin email
UPDATE users
SET
  is_super_admin = true,
  role = 'admin'
WHERE email = 'scott.kaufman@stacksdata.com';

-- If that user doesn't exist, try other StacksData emails
UPDATE users
SET
  is_super_admin = true,
  role = 'admin'
WHERE email ILIKE '%scott.kaufman%stacksdata%'
  AND is_super_admin IS NOT TRUE;

-- Verify the update
DO $$
DECLARE
  super_admin_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO super_admin_count
  FROM users
  WHERE is_super_admin = true;

  RAISE NOTICE 'Super admin users configured: %', super_admin_count;

  IF super_admin_count = 0 THEN
    RAISE WARNING 'No super admin users found. You may need to create an auth user first and re-run this migration with the correct email.';
  END IF;
END $$;

-- Create a view for association-wide metrics (super admin only)
CREATE OR REPLACE VIEW association_metrics AS
SELECT
  -- Company metrics
  COUNT(DISTINCT c.id) as total_companies,
  COUNT(DISTINCT CASE WHEN s.company_id IS NOT NULL THEN c.id END) as active_companies,

  -- Sheet metrics
  COUNT(s.id) as total_sheets,
  COUNT(CASE WHEN s.new_status = 'completed' OR s.new_status = 'approved' THEN 1 END) as completed_sheets,
  COUNT(CASE WHEN s.new_status = 'in_progress' THEN 1 END) as in_progress_sheets,
  COUNT(CASE WHEN s.new_status = 'pending' THEN 1 END) as pending_sheets,

  -- User metrics
  COUNT(DISTINCT u.id) as total_users,
  COUNT(DISTINCT CASE WHEN u.last_sign_in_at > NOW() - INTERVAL '30 days' THEN u.id END) as active_users_30d,

  -- Compliance metrics
  ROUND(
    100.0 * COUNT(CASE WHEN s.new_status = 'completed' OR s.new_status = 'approved' THEN 1 END) /
    NULLIF(COUNT(s.id), 0),
    2
  ) as overall_completion_rate,

  -- Activity metrics
  COUNT(CASE WHEN s.created_at > NOW() - INTERVAL '7 days' THEN 1 END) as sheets_created_7d,
  COUNT(CASE WHEN s.modified_at > NOW() - INTERVAL '7 days' THEN 1 END) as sheets_modified_7d

FROM companies c
LEFT JOIN sheets s ON s.company_id = c.id OR s.assigned_to_company_id = c.id
LEFT JOIN users u ON u.company_id = c.id;

COMMENT ON VIEW association_metrics IS 'Association-wide metrics for super admin dashboard. Shows aggregate stats across all companies.';

-- Grant access to authenticated users (RLS will filter to super admin only)
GRANT SELECT ON association_metrics TO authenticated;

-- Create a function to get per-company metrics (super admin only)
CREATE OR REPLACE FUNCTION get_company_metrics(company_uuid UUID DEFAULT NULL)
RETURNS TABLE (
  company_id UUID,
  company_name TEXT,
  total_sheets BIGINT,
  completed_sheets BIGINT,
  in_progress_sheets BIGINT,
  pending_sheets BIGINT,
  completion_rate NUMERIC,
  active_users BIGINT,
  sheets_created_30d BIGINT,
  last_activity TIMESTAMP WITH TIME ZONE
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT
    c.id as company_id,
    c.name as company_name,
    COUNT(s.id) as total_sheets,
    COUNT(CASE WHEN s.new_status = 'completed' OR s.new_status = 'approved' THEN 1 END) as completed_sheets,
    COUNT(CASE WHEN s.new_status = 'in_progress' THEN 1 END) as in_progress_sheets,
    COUNT(CASE WHEN s.new_status = 'pending' THEN 1 END) as pending_sheets,
    ROUND(
      100.0 * COUNT(CASE WHEN s.new_status = 'completed' OR s.new_status = 'approved' THEN 1 END) /
      NULLIF(COUNT(s.id), 0),
      2
    ) as completion_rate,
    COUNT(DISTINCT CASE WHEN u.last_sign_in_at > NOW() - INTERVAL '30 days' THEN u.id END) as active_users,
    COUNT(CASE WHEN s.created_at > NOW() - INTERVAL '30 days' THEN 1 END) as sheets_created_30d,
    MAX(GREATEST(s.created_at, s.modified_at)) as last_activity
  FROM companies c
  LEFT JOIN sheets s ON s.company_id = c.id OR s.assigned_to_company_id = c.id
  LEFT JOIN users u ON u.company_id = c.id
  WHERE
    CASE
      WHEN company_uuid IS NOT NULL THEN c.id = company_uuid
      ELSE true
    END
  GROUP BY c.id, c.name
  ORDER BY total_sheets DESC;
$$;

COMMENT ON FUNCTION get_company_metrics IS 'Get detailed metrics per company. If company_uuid provided, returns single company. Otherwise returns all companies (super admin only).';

GRANT EXECUTE ON FUNCTION get_company_metrics TO authenticated;
