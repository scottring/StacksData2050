import { supabase } from './src/migration/supabase-client.js'
import fs from 'fs'

async function main() {
  const sql = fs.readFileSync('/Users/scottkaufman/Developer/StacksData2050/stacks/web/supabase/migrations/20260122000002_enable_public_read_all_tables.sql', 'utf8')

  console.log('Applying migration: enable_public_read_all_tables')
  console.log('='.repeat(60))

  // Execute the entire migration as one transaction
  const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql })

  if (error) {
    console.error('Migration failed:', error)
    process.exit(1)
  }

  console.log('\n✅ Migration applied successfully!')
  console.log('\nEnabled public read access for:')
  console.log('  - sections')
  console.log('  - subsections')
  console.log('  - tags')
  console.log('  - question_tags')
  console.log('  - sheet_tags')
  console.log('  - list_table_columns')
  console.log('  - list_table_rows')
  console.log('  - companies')
  console.log('  - users')
  console.log('  - sheet_statuses')
  console.log('  - answer_rejections')
}

main().catch(console.error)
