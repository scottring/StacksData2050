import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
dotenv.config()

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

const statements = [
  // sheet_tags: allow authenticated users to insert (they need to tag sheets they create)
  `CREATE POLICY "sheet_tags_insert" ON sheet_tags FOR INSERT TO authenticated WITH CHECK (true)`,
  
  // sheet_tags: allow update/delete for super_admin or company owner
  `CREATE POLICY "sheet_tags_delete" ON sheet_tags FOR DELETE TO authenticated USING (
    public.is_super_admin() = true
    OR EXISTS (SELECT 1 FROM sheets WHERE sheets.id = sheet_tags.sheet_id AND (sheets.company_id = public.user_company_id() OR sheets.requesting_company_id = public.user_company_id()))
  )`,

  // request_tags: enable RLS and add policies
  `ALTER TABLE request_tags ENABLE ROW LEVEL SECURITY`,
  `CREATE POLICY "request_tags_select" ON request_tags FOR SELECT TO authenticated USING (true)`,
  `CREATE POLICY "request_tags_insert" ON request_tags FOR INSERT TO authenticated WITH CHECK (true)`,

  // invitations: enable RLS and add policies
  `ALTER TABLE invitations ENABLE ROW LEVEL SECURITY`,
  `CREATE POLICY "invitations_select" ON invitations FOR SELECT TO authenticated USING (true)`,
  `CREATE POLICY "invitations_insert" ON invitations FOR INSERT TO authenticated WITH CHECK (true)`,
  `CREATE POLICY "invitations_update" ON invitations FOR UPDATE TO authenticated USING (true)`,

  // request_custom_questions: enable RLS and add policies
  `ALTER TABLE request_custom_questions ENABLE ROW LEVEL SECURITY`,
  `CREATE POLICY "request_custom_questions_select" ON request_custom_questions FOR SELECT TO authenticated USING (true)`,
  `CREATE POLICY "request_custom_questions_insert" ON request_custom_questions FOR INSERT TO authenticated WITH CHECK (true)`,

  // company_questions: enable RLS and add policies  
  `ALTER TABLE company_questions ENABLE ROW LEVEL SECURITY`,
  `CREATE POLICY "company_questions_select" ON company_questions FOR SELECT TO authenticated USING (true)`,
  `CREATE POLICY "company_questions_insert" ON company_questions FOR INSERT TO authenticated WITH CHECK (true)`,
]

async function fix() {
  for (const sql of statements) {
    const shortName = sql.substring(0, 80)
    try {
      const resp = await fetch(`${process.env.SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY!,
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY!}`,
        },
        body: JSON.stringify({ sql }),
      })
      
      if (!resp.ok) {
        const text = await resp.text()
        if (text.includes('already exists')) {
          console.log(`SKIP (exists): ${shortName}...`)
        } else if (text.includes('does not exist')) {
          console.log(`SKIP (no table): ${shortName}...`)
        } else {
          console.log(`FAIL: ${shortName}...`)
          console.log(`  ${text.substring(0, 200)}`)
        }
      } else {
        console.log(`OK: ${shortName}...`)
      }
    } catch (e: any) {
      console.log(`ERROR: ${shortName}... ${e.message}`)
    }
  }
  console.log('\nDone.')
}

fix()
