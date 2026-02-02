import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
dotenv.config()

const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
)

// IDs from previous setup
const DEMO_CUSTOMER = {
  userId: '4fbb6020-efff-48c1-a5a1-e736f7ad6ef8',
  email: 'demo-customer@stacksdata.com',
  companyId: '4be0370a-c06e-428e-8c80-faa2167e2c26',
  fullName: 'Demo Customer',
}

const DEMO_SUPPLIER = {
  userId: '56139dc8-c828-4f6a-a968-afc0823a2708',
  email: 'demo-supplier@stacksdata.com',
  companyId: 'd8d14635-ad01-40f2-8554-ee6551968ebd',
  fullName: 'Demo Supplier',
}

async function linkUsers() {
  console.log('Linking demo users to companies...\n')

  // Create/update Demo Customer user record
  const { error: customerError } = await supabase
    .from('users')
    .upsert({
      id: DEMO_CUSTOMER.userId,
      email: DEMO_CUSTOMER.email,
      company_id: DEMO_CUSTOMER.companyId,
      full_name: DEMO_CUSTOMER.fullName,
      role: 'user',
    })

  if (customerError) {
    console.error('Failed to link Demo Customer:', customerError.message)
  } else {
    console.log('✓ Linked Demo Customer to Demo Customer Co')
  }

  // Create/update Demo Supplier user record
  const { error: supplierError } = await supabase
    .from('users')
    .upsert({
      id: DEMO_SUPPLIER.userId,
      email: DEMO_SUPPLIER.email,
      company_id: DEMO_SUPPLIER.companyId,
      full_name: DEMO_SUPPLIER.fullName,
      role: 'user',
    })

  if (supplierError) {
    console.error('Failed to link Demo Supplier:', supplierError.message)
  } else {
    console.log('✓ Linked Demo Supplier to Demo Supplier Co')
  }

  console.log('\nDone!')
}

linkUsers().catch(console.error)
