import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
dotenv.config()

const PROJECT_REF = 'yrguoooxamecsjtkfqcw'

async function runSQL(sql: string) {
  const resp = await fetch(`https://${PROJECT_REF}.supabase.co/rest/v1/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY!,
      'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY!}`,
    },
  })
  // REST API won't work for DDL. Use the Supabase SQL API via management API
  // Actually, let's use the supabase-js client with a custom query function
}

// Alternative: create a temporary function to execute SQL
async function main() {
  const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

  // First, create the exec_sql function
  const createFn = `
    CREATE OR REPLACE FUNCTION public.exec_sql(sql text) RETURNS void AS $$
    BEGIN
      EXECUTE sql;
    END;
    $$ LANGUAGE plpgsql SECURITY DEFINER;
  `
  
  // We need to use the pg endpoint. Let's try the Supabase SQL editor API
  const mgmtUrl = `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`
  
  // Need management API key for this. Let's try another approach.
  // Use the supabase client to call a raw SQL via pg_net or similar.
  
  // Simplest approach: use the Supabase Dashboard SQL editor manually
  // OR use the pg connection string directly
  
  // Let's try using supabase-js postgrest with a function
  // Actually, the previous agent used this successfully, so let's check how
  
  console.log("The exec_sql function doesn't exist. You need to run this SQL in the Supabase SQL Editor:")
  console.log("")
  console.log("-- Step 1: Create exec_sql helper")
  console.log(createFn)
  console.log("")
  console.log("-- Step 2: Add missing RLS policies")
  
  const policies = [
    `-- sheet_tags INSERT (needed for request creation)
CREATE POLICY "sheet_tags_insert" ON sheet_tags FOR INSERT TO authenticated WITH CHECK (true);`,
    
    `-- request_tags RLS
ALTER TABLE request_tags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "request_tags_select" ON request_tags FOR SELECT TO authenticated USING (true);
CREATE POLICY "request_tags_insert" ON request_tags FOR INSERT TO authenticated WITH CHECK (true);`,

    `-- invitations RLS
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "invitations_select" ON invitations FOR SELECT TO authenticated USING (true);
CREATE POLICY "invitations_insert" ON invitations FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "invitations_update" ON invitations FOR UPDATE TO authenticated USING (true);`,

    `-- request_custom_questions RLS
ALTER TABLE request_custom_questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "request_custom_questions_select" ON request_custom_questions FOR SELECT TO authenticated USING (true);
CREATE POLICY "request_custom_questions_insert" ON request_custom_questions FOR INSERT TO authenticated WITH CHECK (true);`,

    `-- company_questions RLS
ALTER TABLE company_questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "company_questions_select" ON company_questions FOR SELECT TO authenticated USING (true);
CREATE POLICY "company_questions_insert" ON company_questions FOR INSERT TO authenticated WITH CHECK (true);`,
  ]
  
  policies.forEach(p => console.log("\n" + p))
}

main()
