import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function main() {
  console.log('Fixing RLS policies for sections and related tables...\n')

  const tables = [
    'sections',
    'subsections',
    'tags',
    'question_tags',
    'sheet_tags',
    'list_table_columns',
    'list_table_rows',
    'companies',
    'users',
    'sheet_statuses',
    'answer_rejections'
  ]

  for (const table of tables) {
    console.log(`Processing ${table}...`)

    // Drop existing policy if it exists
    const dropSql = `DROP POLICY IF EXISTS "Enable read access for all users" ON ${table};`
    const { error: dropError } = await supabase.rpc('query', { query: dropSql })

    // Create new policy
    const createSql = `
      CREATE POLICY "Enable read access for all users"
      ON ${table}
      FOR SELECT
      USING (true);
    `
    const { error: createError } = await supabase.rpc('query', { query: createSql })

    if (dropError || createError) {
      console.error(`  ❌ Error for ${table}:`, dropError || createError)
    } else {
      console.log(`  ✅ ${table} policy created`)
    }
  }

  console.log('\nDone!')
}

main().catch(console.error)
