import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
dotenv.config({ path: path.join(__dirname, '.env') })

const supabaseUrl = process.env.SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Service role client (bypasses RLS)
const supabaseService = createClient(supabaseUrl, supabaseServiceKey)

// Anon client (subject to RLS) - simulates frontend
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlyZ3Vvb294YW1lY3NqdGtmcWN3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ2MTY0NTksImV4cCI6MjA4MDE5MjQ1OX0.YHwvnbd8QWJGo8BmcAn47oPvXR1vyFQ90KGA7u4_rhs'
const supabaseAnon = createClient(supabaseUrl, ANON_KEY)

async function main() {
  const sheetId = '1038e05e-f492-4bf3-a101-bb7593142bb1'

  console.log('Testing answer fetch with SERVICE ROLE (bypasses RLS):')
  const { data: serviceAnswers, error: serviceError } = await supabaseService
    .from('answers')
    .select('*')
    .eq('sheet_id', sheetId)

  console.log('  Answers:', serviceAnswers?.length || 0)
  if (serviceError) {
    console.log('  Error:', serviceError)
  }

  console.log('\nTesting answer fetch with ANON KEY (subject to RLS):')
  const { data: anonAnswers, error: anonError } = await supabaseAnon
    .from('answers')
    .select('*')
    .eq('sheet_id', sheetId)

  console.log('  Answers:', anonAnswers?.length || 0)
  if (anonError) {
    console.log('  Error:', anonError)
  }

  console.log('\n🔍 Diagnosis:')
  if (serviceAnswers && serviceAnswers.length > 0 && (!anonAnswers || anonAnswers.length === 0)) {
    console.log('❌ RLS POLICY IS BLOCKING ANON ACCESS!')
    console.log('   Answers exist but RLS prevents frontend from seeing them.')
    console.log('   Solution: Check RLS policies on answers table.')
  } else if (anonAnswers && anonAnswers.length > 0) {
    console.log('✅ Anon access works - RLS is NOT the problem')
  }
}

main().catch(console.error)
