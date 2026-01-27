import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config()

const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
)

async function checkData() {
  // Check sheets count
  const { count: sheetsCount } = await supabase
    .from('sheets')
    .select('*', { count: 'exact', head: true })

  console.log('Total sheets in DB:', sheetsCount)

  // Check companies
  const { count: companiesCount } = await supabase
    .from('companies')
    .select('*', { count: 'exact', head: true })

  console.log('Total companies in DB:', companiesCount)

  // Check users
  const { data: users } = await supabase
    .from('users')
    .select('id, email, company_id, role, is_super_admin')
    .order('is_super_admin', { ascending: false })
    .limit(10)

  console.log('\nUsers (first 10):')
  users?.forEach(u => {
    const companyId = u.company_id ? u.company_id.slice(0, 8) + '...' : 'NO COMPANY'
    console.log(`- ${u.email} | Company: ${companyId} | Role: ${u.role} | SuperAdmin: ${u.is_super_admin}`)
  })

  // Check if any sheets have status
  const { data: statusSample } = await supabase
    .from('sheets')
    .select('id, name, new_status, company_id')
    .limit(10)

  console.log('\nSample sheets (first 10):')
  statusSample?.forEach(s => {
    const name = s.name ? s.name.slice(0, 50) : 'Unnamed'
    console.log(`- ${name} | Status: ${s.new_status || 'NULL'}`)
  })

  // Count sheets by status
  const { data: allSheets } = await supabase
    .from('sheets')
    .select('new_status')
    .limit(10000)

  const statusCounts: Record<string, number> = {}
  allSheets?.forEach(s => {
    const status = s.new_status || 'NULL'
    statusCounts[status] = (statusCounts[status] || 0) + 1
  })

  console.log('\nSheets by status:')
  Object.entries(statusCounts)
    .sort((a, b) => b[1] - a[1])
    .forEach(([status, count]) => {
      console.log(`- ${status}: ${count}`)
    })
}

checkData()
