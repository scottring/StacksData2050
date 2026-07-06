import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function main() {
  // Find UPM company
  const { data: upm } = await supabase
    .from('companies')
    .select('id, name')
    .ilike('name', '%UPM%')
  
  console.log('UPM companies:', upm)
  
  if (!upm || upm.length === 0) return

  const upmId = upm[0].id

  // Sheets where UPM is the customer (company_id) - this is what the fix queries
  const { data: asCustomer, count: customerCount } = await supabase
    .from('sheets')
    .select('id, name, status, company_id, requesting_company_id', { count: 'exact' })
    .eq('company_id', upmId)
    .limit(5)

  console.log(`\nSheets where UPM is company_id (customer): ${customerCount}`)
  asCustomer?.forEach(s => console.log(`  - ${s.name} | status: ${s.status} | supplier: ${s.requesting_company_id}`))

  // Sheets where UPM is the supplier (requesting_company_id) - old broken query
  const { data: asSupplier, count: supplierCount } = await supabase
    .from('sheets')
    .select('id, name, status, company_id, requesting_company_id', { count: 'exact' })
    .eq('requesting_company_id', upmId)
    .limit(5)

  console.log(`\nSheets where UPM is requesting_company_id (supplier): ${supplierCount}`)
  asSupplier?.forEach(s => console.log(`  - ${s.name} | status: ${s.status} | customer: ${s.company_id}`))
}

main()
