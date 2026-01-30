import { supabase } from './src/migration/supabase-client.js'

async function checkCompaniesAndUsers() {
  console.log('\n=== COMPANIES WITH SHEET ACTIVITY ===\n')

  // Get all sheets to count by company
  const { data: allSheets } = await supabase
    .from('sheets')
    .select('company_id, assigned_to_company_id, new_status')

  // Count by company
  const customerCounts = new Map<string, number>()
  const supplierCounts = new Map<string, number>()
  const completeCounts = new Map<string, number>()

  for (const sheet of allSheets || []) {
    if (sheet.company_id) {
      customerCounts.set(sheet.company_id, (customerCounts.get(sheet.company_id) || 0) + 1)
      if (sheet.new_status === 'completed' || sheet.new_status === 'approved') {
        completeCounts.set(sheet.company_id, (completeCounts.get(sheet.company_id) || 0) + 1)
      }
    }
    if (sheet.assigned_to_company_id) {
      supplierCounts.set(sheet.assigned_to_company_id, (supplierCounts.get(sheet.assigned_to_company_id) || 0) + 1)
    }
  }

  // Get company details
  const { data: companies } = await supabase
    .from('companies')
    .select('id, name')

  const companyMap = new Map(companies?.map(c => [c.id, c.name]) || [])

  // Show top companies
  const sorted = Array.from(customerCounts.entries())
    .map(([id, count]) => ({
      id,
      name: companyMap.get(id) || 'Unknown',
      customerSheets: count,
      supplierSheets: supplierCounts.get(id) || 0,
      completeSheets: completeCounts.get(id) || 0
    }))
    .sort((a, b) => b.customerSheets - a.customerSheets)
    .slice(0, 10)

  for (const company of sorted) {
    console.log(`${company.name}`)
    console.log(`  Company ID: ${company.id}`)
    console.log(`  As Customer: ${company.customerSheets} sheets (${company.completeSheets} complete)`)
    console.log(`  As Supplier: ${company.supplierSheets} sheets`)
    console.log('')
  }

  console.log('\n=== USERS FROM TOP COMPANIES ===\n')

  const topCompanyIds = sorted.slice(0, 5).map(c => c.id)

  const { data: users } = await supabase
    .from('users')
    .select('id, email, company_id')
    .in('company_id', topCompanyIds)

  for (const companyId of topCompanyIds) {
    const companyName = companyMap.get(companyId)
    const companyUsers = users?.filter(u => u.company_id === companyId) || []

    if (companyUsers.length > 0) {
      console.log(`${companyName}:`)
      companyUsers.slice(0, 5).forEach(u => {
        console.log(`  - ${u.email}`)
      })
      console.log('')
    }
  }

  // Check current user
  console.log('\n=== YOUR CURRENT USER ===\n')
  const { data: { user } } = await supabase.auth.getUser()
  if (user) {
    const { data: userProfile } = await supabase
      .from('users')
      .select('id, email, company_id, is_super_admin, role, companies(name)')
      .eq('id', user.id)
      .single()

    console.log(`Email: ${userProfile?.email}`)
    console.log(`Company: ${(userProfile?.companies as any)?.name}`)
    console.log(`Super Admin: ${userProfile?.is_super_admin || false}`)
    console.log(`Role: ${userProfile?.role || 'none'}`)
  } else {
    console.log('Not logged in')
  }
}

checkCompaniesAndUsers().catch(console.error)
