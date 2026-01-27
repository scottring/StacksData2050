import { supabase } from './src/migration/supabase-client.js'

console.log('=== Test Data Cleanup ===\n')

// Step 1: Identify Stacks Data companies
console.log('Step 1: Finding Stacks Data companies...')
const { data: stacksCompanies } = await supabase
  .from('companies')
  .select('id, name')
  .ilike('name', '%stacks%')

console.log(`Found ${stacksCompanies?.length} Stacks-related companies:`)
stacksCompanies?.forEach(c => console.log(`  - ${c.name} (${c.id})`))

// Step 2: Count sheets for Stacks Data companies
console.log('\nStep 2: Counting sheets for Stacks Data companies...')
let totalStacksSheets = 0
for (const company of stacksCompanies || []) {
  const { count } = await supabase
    .from('sheets')
    .select('*', { count: 'exact', head: true })
    .eq('company_id', company.id)

  console.log(`  ${company.name}: ${count} sheets`)
  totalStacksSheets += count || 0
}

// Step 3: Find sheets with test/example/stacks in name across ALL companies
console.log('\nStep 3: Finding test/example sheets across all companies...')
const { data: allSheets } = await supabase
  .from('sheets')
  .select('id, name, company_id, companies!sheets_company_id_fkey(name)')

const testSheets = (allSheets || []).filter(s =>
  s.name?.toLowerCase().includes('test') ||
  s.name?.toLowerCase().includes('example') ||
  s.name?.toLowerCase().includes('stacks')
)

console.log(`Found ${testSheets.length} sheets with test/example/stacks in name`)

// Group by company
const byCompany = new Map()
testSheets.forEach(s => {
  const companyName = (s.companies as any)?.name || 'Unknown'
  const existing = byCompany.get(companyName) || []
  existing.push(s)
  byCompany.set(companyName, existing)
})

console.log('\nTest sheets by company:')
Array.from(byCompany.entries())
  .sort((a, b) => b[1].length - a[1].length)
  .forEach(([company, sheets]) => {
    console.log(`  ${company}: ${sheets.length} test sheets`)
    if (sheets.length <= 5) {
      sheets.forEach(s => console.log(`    - ${s.name}`))
    } else {
      sheets.slice(0, 3).forEach(s => console.log(`    - ${s.name}`))
      console.log(`    ... and ${sheets.length - 3} more`)
    }
  })

// Step 4: Analyze UPM duplicates
console.log('\n\nStep 4: Analyzing UPM duplicates...')
const { data: upm } = await supabase
  .from('companies')
  .select('id, name')
  .eq('name', 'UPM')
  .single()

if (upm) {
  const { data: upmSheets } = await supabase
    .from('sheets')
    .select('id, name, created_at, modified_at')
    .eq('company_id', upm.id)
    .order('name')

  // Find duplicates
  const nameGroups = new Map()
  upmSheets?.forEach(s => {
    const existing = nameGroups.get(s.name) || []
    existing.push(s)
    nameGroups.set(s.name, existing)
  })

  const duplicates = Array.from(nameGroups.entries())
    .filter(([name, sheets]) => sheets.length > 1)
    .sort((a, b) => b[1].length - a[1].length)

  console.log(`UPM has ${duplicates.length} duplicate sheet names`)
  console.log(`Total duplicate sheets: ${duplicates.reduce((sum, [, sheets]) => sum + sheets.length, 0)}`)
  console.log(`Unique sheets if deduplicated: ${nameGroups.size}`)
  console.log(`\nTop 10 most duplicated:`)
  duplicates.slice(0, 10).forEach(([name, sheets]) => {
    console.log(`  "${name}": ${sheets.length} copies`)
    console.log(`    Created: ${sheets.map(s => s.created_at).join(', ')}`)
  })

  // Recommend which duplicates to keep (newest by modified_at)
  console.log('\n\nStep 5: Generating cleanup recommendations...')
  console.log('For each duplicate group, will keep the NEWEST sheet (by modified_at):\n')

  let totalToDelete = 0
  const sheetsToDelete: string[] = []

  duplicates.slice(0, 20).forEach(([name, sheets]) => {
    // Sort by modified_at descending (newest first)
    const sorted = sheets.sort((a, b) => {
      const dateA = new Date(a.modified_at || a.created_at || 0).getTime()
      const dateB = new Date(b.modified_at || b.created_at || 0).getTime()
      return dateB - dateA
    })

    const toKeep = sorted[0]
    const toDelete = sorted.slice(1)

    console.log(`"${name}":`)
    console.log(`  KEEP: ${toKeep.id} (modified: ${toKeep.modified_at})`)
    toDelete.forEach(s => {
      console.log(`  DELETE: ${s.id} (modified: ${s.modified_at})`)
      sheetsToDelete.push(s.id)
    })

    totalToDelete += toDelete.length
  })

  console.log(`\n\nTotal sheets to delete from top 20 duplicates: ${totalToDelete}`)

  // Summary
  console.log('\n\n=== CLEANUP SUMMARY ===')
  console.log(`\n1. Stacks Data Company Sheets:`)
  console.log(`   - ${totalStacksSheets} sheets to DELETE`)
  console.log(`   - Companies: ${stacksCompanies?.map(c => c.name).join(', ')}`)

  console.log(`\n2. Test/Example Sheets:`)
  console.log(`   - ${testSheets.length} sheets with test/example/stacks in name`)
  console.log(`   - Spans ${byCompany.size} companies`)

  console.log(`\n3. UPM Duplicates:`)
  console.log(`   - ${duplicates.length} duplicate names`)
  console.log(`   - ${duplicates.reduce((sum, [, sheets]) => sum + sheets.length - 1, 0)} duplicate sheets to remove`)
  console.log(`   - Would reduce UPM from 593 to ${nameGroups.size} unique sheets`)

  console.log(`\n\nWould you like to proceed with cleanup?`)
  console.log(`Run: npx tsx execute-cleanup.ts`)
}
