import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import dotenv from 'dotenv'

dotenv.config({ path: './web/.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials in ./web/.env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function applyMigration() {
  console.log('=== Applying Tag RLS Migration ===\n')

  const migrationPath = './web/supabase/migrations/20260112000001_add_tag_table_rls_policies.sql'
  const sql = fs.readFileSync(migrationPath, 'utf-8')

  console.log(`Reading migration from: ${migrationPath}`)
  console.log(`SQL length: ${sql.length} characters\n`)

  // Execute the migration SQL directly
  // Note: We'll use a PostgreSQL connection string approach
  console.log('Attempting to execute migration...\n')

  // Split into individual statements
  const statements = sql
    .split(/;\s*$/gm)
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'))

  console.log(`Executing ${statements.length} statements...\n`)

  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i]
    if (stmt.includes('DROP POLICY') || stmt.includes('CREATE POLICY') || stmt.includes('ALTER TABLE') || stmt.includes('DO $$')) {
      const preview = stmt.substring(0, 100).replace(/\s+/g, ' ')
      console.log(`[${i + 1}] ${preview}...`)

      try {
        // Use rpc to execute SQL if available
        const { error } = await supabase.rpc('exec_sql', { sql: stmt + ';' }) as any

        if (error) {
          throw error
        }
        console.log(`    ✅ Success\n`)
      } catch (error: any) {
        console.log(`    ⚠️  ${error.message || error}\n`)
        // Continue - some errors are expected
      }
    }
  }

  console.log('\n=== Migration Instructions ===')
  console.log('\nIf the above automatic execution failed, please run manually:')
  console.log('1. Go to Supabase Dashboard > SQL Editor')
  console.log('2. Open this file: ./web/supabase/migrations/20260112000001_add_tag_table_rls_policies.sql')
  console.log('3. Copy and paste the entire contents')
  console.log('4. Click "Run"')
  console.log('\nOr use psql:')
  console.log(`psql "postgresql://postgres:[password]@[host]:5432/postgres" < ${migrationPath}`)
}

applyMigration().catch(console.error)
