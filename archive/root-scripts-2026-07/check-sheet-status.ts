import { createClient } from '@supabase/supabase-js'

const s = createClient(
  'https://yrguoooxamecsjtkfqcw.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlyZ3Vvb294YW1lY3NqdGtmcWN3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDYxNjQ1OSwiZXhwIjoyMDgwMTkyNDU5fQ.vJjf-cGgyumKE2nPec1-vOik3lFn7lvlQM0xcNiiPbk'
)

async function main() {
  // Update sheets RLS: allow any authenticated user associated with the sheet to update
  const { error } = await s.rpc('exec_sql' as any, {
    query: `
      -- Drop the existing restrictive policy
      DROP POLICY IF EXISTS "sheets_update" ON sheets;
      DROP POLICY IF EXISTS "sheets_update_policy" ON sheets;
      DROP POLICY IF EXISTS "Admins and editors can update their company's sheets" ON sheets;

      -- Create a more permissive update policy
      CREATE POLICY "sheets_update"
      ON sheets FOR UPDATE
      USING (
        public.is_super_admin() = true
        OR company_id = public.user_company_id()
        OR requesting_company_id = public.user_company_id()
      );
    `
  })

  if (error) {
    console.error('RPC not available, need to run via SQL Editor')
    console.log('Run this SQL in the Supabase SQL Editor for yrguoooxamecsjtkfqcw:')
    console.log(`
DROP POLICY IF EXISTS "sheets_update" ON sheets;
DROP POLICY IF EXISTS "sheets_update_policy" ON sheets;
DROP POLICY IF EXISTS "Admins and editors can update their company's sheets" ON sheets;

CREATE POLICY "sheets_update"
ON sheets FOR UPDATE
USING (
  public.is_super_admin() = true
  OR company_id = public.user_company_id()
  OR requesting_company_id = public.user_company_id()
);
    `)
  } else {
    console.log('Policy updated successfully')
  }

  // Also update sheet_statuses insert policy to be more permissive
  const { error: err2 } = await s.rpc('exec_sql' as any, {
    query: `
      DROP POLICY IF EXISTS "sheet_statuses_insert" ON sheet_statuses;
      CREATE POLICY "sheet_statuses_insert"
      ON sheet_statuses FOR INSERT
      WITH CHECK (true);
    `
  })

  if (err2) {
    console.log('\nAlso run this for sheet_statuses:')
    console.log(`
DROP POLICY IF EXISTS "sheet_statuses_insert" ON sheet_statuses;
DROP POLICY IF EXISTS "dev_authenticated_insert" ON sheet_statuses;

CREATE POLICY "sheet_statuses_insert"
ON sheet_statuses FOR INSERT
TO authenticated
WITH CHECK (true);
    `)
  }
}

main()
