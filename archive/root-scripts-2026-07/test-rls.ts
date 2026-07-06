import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Load env from both locations
dotenv.config()
const webEnvPath = path.join(__dirname, 'web', '.env.local')
if (fs.existsSync(webEnvPath)) {
  dotenv.config({ path: webEnvPath })
}

async function testRLS() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !anonKey) {
    console.log('Missing env vars. URL:', !!url, 'AnonKey:', !!anonKey)
    console.log('Available env vars:', Object.keys(process.env).filter(k => k.includes('SUPA')))
    return
  }

  console.log('Testing RLS with anon key (respects RLS policies)\n')

  const supabase = createClient(url, anonKey)

  // Test 1: UPM (customer)
  console.log('=== Test 1: UPM (Customer) ===')
  const { data: upmAuth, error: upmError } = await supabase.auth.signInWithPassword({
    email: 'kaisa.herranen@upm.com',
    password: 'demo2026'
  })

  if (upmError) {
    console.log('UPM login error:', upmError.message)
    return
  }

  console.log('Logged in as:', upmAuth.user?.email)

  const { data: upmSheets, count: upmSheetCount } = await supabase
    .from('sheets')
    .select('id, name, company_id', { count: 'exact' })
    .limit(5)

  console.log('Sheets visible:', upmSheetCount)

  const { data: upmCompanies, count: upmCompanyCount } = await supabase
    .from('companies')
    .select('id, name', { count: 'exact' })
    .limit(5)

  console.log('Companies visible:', upmCompanyCount)
  if (upmCompanies) {
    console.log('Sample companies:', upmCompanies.map(c => c.name).join(', '))
  }

  await supabase.auth.signOut()

  // Test 2: Kemira (supplier)
  console.log('\n=== Test 2: Kemira (Supplier) ===')
  const { data: kemiraAuth, error: kemiraError } = await supabase.auth.signInWithPassword({
    email: 'tiia.aho@kemira.com',
    password: 'demo2026'
  })

  if (kemiraError) {
    console.log('Kemira login error:', kemiraError.message)
    return
  }

  console.log('Logged in as:', kemiraAuth.user?.email)

  const { count: kemiraSheetCount } = await supabase
    .from('sheets')
    .select('id', { count: 'exact', head: true })

  console.log('Sheets visible:', kemiraSheetCount)

  const { data: kemiraCompanies, count: kemiraCompanyCount } = await supabase
    .from('companies')
    .select('id, name', { count: 'exact' })
    .limit(5)

  console.log('Companies visible:', kemiraCompanyCount)
  if (kemiraCompanies) {
    console.log('Sample companies:', kemiraCompanies.map(c => c.name).join(', '))
  }

  await supabase.auth.signOut()

  // Test 3: Check if different users see different data
  console.log('\n=== Summary ===')
  console.log('UPM sheets:', upmSheetCount, '| Kemira sheets:', kemiraSheetCount)
  console.log('UPM companies:', upmCompanyCount, '| Kemira companies:', kemiraCompanyCount)

  if (upmSheetCount === kemiraSheetCount && upmSheetCount === 749) {
    console.log('\n⚠️  WARNING: Both users see ALL 749 sheets - RLS may not be working!')
  } else if (upmSheetCount !== kemiraSheetCount) {
    console.log('\n✅ RLS appears to be working - users see different sheet counts')
  }

  if (upmCompanyCount === kemiraCompanyCount && upmCompanyCount === 136) {
    console.log('⚠️  WARNING: Both users see ALL 136 companies - RLS may not be working!')
  } else if (upmCompanyCount !== kemiraCompanyCount) {
    console.log('✅ Company RLS appears to be working - users see different company counts')
  }
}

testRLS().catch(console.error)
