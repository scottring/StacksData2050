import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config()

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { db: { schema: 'public' } }
)

async function run() {
  // Use raw SQL via the PostgREST rpc or direct pg
  // Since exec_sql doesn't exist, we'll use the supabase-js query method
  // Actually, let's just use fetch against the Supabase REST SQL endpoint

  const url = process.env.SUPABASE_URL!
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!

  // Supabase exposes a SQL endpoint at /rest/v1/rpc but we need raw SQL
  // Use the pg_net extension or just call the management API
  // Simplest: use the Supabase SQL API (requires project ref and service role)

  const projectRef = 'yrguoooxamecsjtkfqcw'
  
  // Check current state
  const checkRes = await fetch(`${url}/rest/v1/rpc/`, {
    method: 'POST',
    headers: {
      'apikey': key,
      'Authorization': `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
  })

  // Alternative: just output the SQL for the user to run
  console.log('\n=== Run this SQL in Supabase SQL Editor ===\n')
  console.log(`-- Check current realtime tables`)
  console.log(`SELECT schemaname, tablename FROM pg_publication_tables WHERE pubname = 'supabase_realtime';`)
  console.log()
  console.log(`-- Enable realtime on sheets and requests`)
  console.log(`ALTER PUBLICATION supabase_realtime ADD TABLE sheets;`)
  console.log(`ALTER PUBLICATION supabase_realtime ADD TABLE requests;`)
  console.log()
  console.log(`-- Verify`)
  console.log(`SELECT schemaname, tablename FROM pg_publication_tables WHERE pubname = 'supabase_realtime';`)
}

run()
