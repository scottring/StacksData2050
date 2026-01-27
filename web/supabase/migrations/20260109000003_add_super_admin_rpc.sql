-- Add RPC function for super admins to bypass RLS when fetching association-wide data
-- This is safe because it checks is_super_admin before returning data

-- Function to check if current user is super admin (for client calls)
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean AS $$
  SELECT COALESCE(
    (SELECT is_super_admin FROM auth.users WHERE id = auth.uid()),
    false
  )
$$ LANGUAGE sql SECURITY DEFINER STABLE;

GRANT EXECUTE ON FUNCTION public.is_super_admin() TO authenticated;

COMMENT ON FUNCTION public.is_super_admin() IS 'Check if current user is a super admin (callable from client)';
