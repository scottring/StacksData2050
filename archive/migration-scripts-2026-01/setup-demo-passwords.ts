import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config()

const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
)

const DEMO_PASSWORD = 'demo2026'

const demoUsers = [
  { id: '3ed3110d-990b-402e-912a-17095cbeb7ef', email: 'kaisa.herranen@upm.com', company: 'UPM' },
  { id: '6a4b5cd2-340d-4ebd-9f5f-bad46362e600', email: 'christian.torborg@sappi.com', company: 'Sappi' },
  { id: 'b8ac8e2a-8edf-4c3c-9080-1a52a7871050', email: 'abdessamad.arbaoui@omya.com', company: 'Omya' },
  { id: '1e118b2b-754c-498f-82db-4f19f9d56f0f', email: 'tiia.aho@kemira.com', company: 'Kemira Oyj' },
]

async function setupDemoPasswords() {
  console.log('Setting up demo passwords...\n')

  for (const user of demoUsers) {
    const { data, error } = await supabase.auth.admin.updateUserById(
      user.id,
      { password: DEMO_PASSWORD }
    )

    if (error) {
      console.error(`❌ Failed to set password for ${user.email}:`, error.message)
    } else {
      console.log(`✅ ${user.company}: ${user.email}`)
    }
  }

  console.log('\n✅ Demo passwords set successfully!')
  console.log(`\nPassword for all demo accounts: ${DEMO_PASSWORD}`)
  console.log('\nDemo Accounts:')
  console.log('═══════════════════════════════════════════════════════════')
  demoUsers.forEach(u => {
    console.log(`${u.company.padEnd(15)} ${u.email}`)
  })
  console.log('═══════════════════════════════════════════════════════════')
  console.log('\nYou can now log in to localhost:3000 with any of these accounts')
  console.log(`using password: ${DEMO_PASSWORD}`)
}

setupDemoPasswords()
