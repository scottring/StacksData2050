import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
dotenv.config()

const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
)

// Demo account configuration
const DEMO_CUSTOMER = {
  email: 'demo-customer@stacksdata.com',
  password: 'StacksDemo2026!',
  companyName: 'Demo Customer Co',
  firstName: 'Demo',
  lastName: 'Customer',
}

const DEMO_SUPPLIER = {
  email: 'demo-supplier@stacksdata.com',
  password: 'StacksDemo2026!',
  companyName: 'Demo Supplier Co',
  firstName: 'Demo',
  lastName: 'Supplier',
}

async function setupDemoAccounts() {
  console.log('=== SETTING UP DEMO ACCOUNTS ===\n')

  // Step 1: Check/Create Demo Companies
  console.log('Step 1: Creating demo companies...\n')

  // Check if Demo Customer Co exists
  let { data: existingCustomerCo } = await supabase
    .from('companies')
    .select('id, name')
    .eq('name', DEMO_CUSTOMER.companyName)
    .single()

  let customerCompanyId: string

  if (existingCustomerCo) {
    console.log(`  ✓ ${DEMO_CUSTOMER.companyName} already exists (${existingCustomerCo.id})`)
    customerCompanyId = existingCustomerCo.id
  } else {
    const { data: newCustomerCo, error } = await supabase
      .from('companies')
      .insert({
        name: DEMO_CUSTOMER.companyName,
        is_demo: true,
      })
      .select()
      .single()

    if (error) {
      console.error(`  ✗ Failed to create ${DEMO_CUSTOMER.companyName}:`, error.message)
      // Try without is_demo if column doesn't exist
      const { data: retryData, error: retryError } = await supabase
        .from('companies')
        .insert({ name: DEMO_CUSTOMER.companyName })
        .select()
        .single()

      if (retryError) {
        console.error(`  ✗ Retry failed:`, retryError.message)
        return
      }
      customerCompanyId = retryData.id
      console.log(`  ✓ Created ${DEMO_CUSTOMER.companyName} (${customerCompanyId})`)
    } else {
      customerCompanyId = newCustomerCo.id
      console.log(`  ✓ Created ${DEMO_CUSTOMER.companyName} (${customerCompanyId})`)
    }
  }

  // Check if Demo Supplier Co exists
  let { data: existingSupplierCo } = await supabase
    .from('companies')
    .select('id, name')
    .eq('name', DEMO_SUPPLIER.companyName)
    .single()

  let supplierCompanyId: string

  if (existingSupplierCo) {
    console.log(`  ✓ ${DEMO_SUPPLIER.companyName} already exists (${existingSupplierCo.id})`)
    supplierCompanyId = existingSupplierCo.id
  } else {
    const { data: newSupplierCo, error } = await supabase
      .from('companies')
      .insert({
        name: DEMO_SUPPLIER.companyName,
        is_demo: true,
      })
      .select()
      .single()

    if (error) {
      // Try without is_demo
      const { data: retryData, error: retryError } = await supabase
        .from('companies')
        .insert({ name: DEMO_SUPPLIER.companyName })
        .select()
        .single()

      if (retryError) {
        console.error(`  ✗ Failed to create ${DEMO_SUPPLIER.companyName}:`, retryError.message)
        return
      }
      supplierCompanyId = retryData.id
      console.log(`  ✓ Created ${DEMO_SUPPLIER.companyName} (${supplierCompanyId})`)
    } else {
      supplierCompanyId = newSupplierCo.id
      console.log(`  ✓ Created ${DEMO_SUPPLIER.companyName} (${supplierCompanyId})`)
    }
  }

  // Step 2: Create Auth Users
  console.log('\nStep 2: Creating auth users...\n')

  // Create Demo Customer auth user
  let customerUserId: string | null = null

  // Check if user already exists
  const { data: existingCustomerAuth } = await supabase.auth.admin.listUsers()
  const existingCustomer = existingCustomerAuth?.users?.find(u => u.email === DEMO_CUSTOMER.email)

  if (existingCustomer) {
    console.log(`  ✓ ${DEMO_CUSTOMER.email} auth user already exists (${existingCustomer.id})`)
    customerUserId = existingCustomer.id
  } else {
    const { data: customerAuth, error: customerAuthError } = await supabase.auth.admin.createUser({
      email: DEMO_CUSTOMER.email,
      password: DEMO_CUSTOMER.password,
      email_confirm: true,
    })

    if (customerAuthError) {
      console.error(`  ✗ Failed to create auth user ${DEMO_CUSTOMER.email}:`, customerAuthError.message)
    } else {
      customerUserId = customerAuth.user.id
      console.log(`  ✓ Created auth user ${DEMO_CUSTOMER.email} (${customerUserId})`)
    }
  }

  // Create Demo Supplier auth user
  let supplierUserId: string | null = null

  const existingSupplier = existingCustomerAuth?.users?.find(u => u.email === DEMO_SUPPLIER.email)

  if (existingSupplier) {
    console.log(`  ✓ ${DEMO_SUPPLIER.email} auth user already exists (${existingSupplier.id})`)
    supplierUserId = existingSupplier.id
  } else {
    const { data: supplierAuth, error: supplierAuthError } = await supabase.auth.admin.createUser({
      email: DEMO_SUPPLIER.email,
      password: DEMO_SUPPLIER.password,
      email_confirm: true,
    })

    if (supplierAuthError) {
      console.error(`  ✗ Failed to create auth user ${DEMO_SUPPLIER.email}:`, supplierAuthError.message)
    } else {
      supplierUserId = supplierAuth.user.id
      console.log(`  ✓ Created auth user ${DEMO_SUPPLIER.email} (${supplierUserId})`)
    }
  }

  // Step 3: Create/Update user records in users table
  console.log('\nStep 3: Linking users to companies...\n')

  if (customerUserId) {
    // Check if user record exists
    const { data: existingUserRecord } = await supabase
      .from('users')
      .select('id')
      .eq('id', customerUserId)
      .single()

    if (existingUserRecord) {
      // Update existing record
      const { error } = await supabase
        .from('users')
        .update({
          company_id: customerCompanyId,
          first_name: DEMO_CUSTOMER.firstName,
          last_name: DEMO_CUSTOMER.lastName,
        })
        .eq('id', customerUserId)

      if (error) {
        console.error(`  ✗ Failed to update user record for ${DEMO_CUSTOMER.email}:`, error.message)
      } else {
        console.log(`  ✓ Updated user record for ${DEMO_CUSTOMER.email}`)
      }
    } else {
      // Create user record
      const { error } = await supabase
        .from('users')
        .insert({
          id: customerUserId,
          email: DEMO_CUSTOMER.email,
          company_id: customerCompanyId,
          first_name: DEMO_CUSTOMER.firstName,
          last_name: DEMO_CUSTOMER.lastName,
        })

      if (error) {
        console.error(`  ✗ Failed to create user record for ${DEMO_CUSTOMER.email}:`, error.message)
      } else {
        console.log(`  ✓ Created user record for ${DEMO_CUSTOMER.email}`)
      }
    }
  }

  if (supplierUserId) {
    // Check if user record exists
    const { data: existingUserRecord } = await supabase
      .from('users')
      .select('id')
      .eq('id', supplierUserId)
      .single()

    if (existingUserRecord) {
      // Update existing record
      const { error } = await supabase
        .from('users')
        .update({
          company_id: supplierCompanyId,
          first_name: DEMO_SUPPLIER.firstName,
          last_name: DEMO_SUPPLIER.lastName,
        })
        .eq('id', supplierUserId)

      if (error) {
        console.error(`  ✗ Failed to update user record for ${DEMO_SUPPLIER.email}:`, error.message)
      } else {
        console.log(`  ✓ Updated user record for ${DEMO_SUPPLIER.email}`)
      }
    } else {
      // Create user record
      const { error } = await supabase
        .from('users')
        .insert({
          id: supplierUserId,
          email: DEMO_SUPPLIER.email,
          company_id: supplierCompanyId,
          first_name: DEMO_SUPPLIER.firstName,
          last_name: DEMO_SUPPLIER.lastName,
        })

      if (error) {
        console.error(`  ✗ Failed to create user record for ${DEMO_SUPPLIER.email}:`, error.message)
      } else {
        console.log(`  ✓ Created user record for ${DEMO_SUPPLIER.email}`)
      }
    }
  }

  // Summary
  console.log('\n' + '='.repeat(60))
  console.log('DEMO ACCOUNTS SETUP COMPLETE')
  console.log('='.repeat(60))
  console.log('\nDemo Customer Account:')
  console.log(`  Email: ${DEMO_CUSTOMER.email}`)
  console.log(`  Password: ${DEMO_CUSTOMER.password}`)
  console.log(`  Company: ${DEMO_CUSTOMER.companyName}`)
  console.log('\nDemo Supplier Account:')
  console.log(`  Email: ${DEMO_SUPPLIER.email}`)
  console.log(`  Password: ${DEMO_SUPPLIER.password}`)
  console.log(`  Company: ${DEMO_SUPPLIER.companyName}`)
  console.log('\n' + '='.repeat(60))
}

setupDemoAccounts().catch(console.error)
