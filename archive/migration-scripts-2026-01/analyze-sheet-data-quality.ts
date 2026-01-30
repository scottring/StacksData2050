import { supabase } from './src/migration/supabase-client.js'

console.log('=== Sheet Data Quality Analysis ===\n')

// Get all companies with sheet counts
const { data: companies } = await supabase
  .from('companies')
  .select('id, name')
  .order('name')

console.log(`Total companies: ${companies?.length}\n`)

// Analyze each company
for (const company of companies || []) {
  const { data: sheets } = await supabase
    .from('sheets')
    .select('id, name, company_id, assigned_to_company_id')
    .eq('company_id', company.id)

  if (sheets && sheets.length > 0) {
    console.log(`${company.name}: ${sheets.length} sheets`)

    // Show first 5 sheet names as examples
    const examples = sheets.slice(0, 5).map(s => s.name)
    console.log(`  Examples: ${examples.join(', ')}`)

    // Check for "Stacks" in sheet names (likely test data)
    const stacksSheets = sheets.filter(s =>
      s.name.toLowerCase().includes('stacks') ||
      s.name.toLowerCase().includes('test') ||
      s.name.toLowerCase().includes('example')
    )
    if (stacksSheets.length > 0) {
      console.log(`  ⚠️  Contains ${stacksSheets.length} sheets with "stacks/test/example" in name`)
    }

    console.log('')
  }
}

// Check for Stacks Data company specifically
const { data: stacksCompany } = await supabase
  .from('companies')
  .select('id, name')
  .ilike('name', '%stacks%')

if (stacksCompany && stacksCompany.length > 0) {
  console.log('\n=== Stacks-Related Companies ===')
  for (const company of stacksCompany) {
    const { data: sheets } = await supabase
      .from('sheets')
      .select('id, name')
      .eq('company_id', company.id)

    console.log(`${company.name} (${company.id}): ${sheets?.length || 0} sheets`)
    if (sheets && sheets.length > 0) {
      console.log(`  Sheet names:`)
      sheets.slice(0, 10).forEach(s => console.log(`    - ${s.name}`))
      if (sheets.length > 10) {
        console.log(`    ... and ${sheets.length - 10} more`)
      }
    }
  }
}

// Check UPM specifically
console.log('\n=== UPM Analysis ===')
const { data: upm } = await supabase
  .from('companies')
  .select('id, name')
  .eq('name', 'UPM')
  .single()

if (upm) {
  console.log(`UPM ID: ${upm.id}`)

  // All sheets
  const { data: allSheets } = await supabase
    .from('sheets')
    .select('id, name, company_id, assigned_to_company_id')
    .eq('company_id', upm.id)

  console.log(`Total sheets owned by UPM: ${allSheets?.length}`)

  // Sheets with chemicals
  const { data: sheetChemicals } = await supabase
    .from('sheet_chemicals')
    .select('sheet_id')
    .in('sheet_id', allSheets?.map(s => s.id) || [])

  const uniqueWithChemicals = new Set(sheetChemicals?.map(s => s.sheet_id) || []).size
  console.log(`Sheets with chemicals: ${uniqueWithChemicals}`)

  // Show sample sheet names
  console.log(`\nSample UPM sheet names:`)
  allSheets?.slice(0, 20).forEach(s => {
    console.log(`  - ${s.name}`)
  })
  if (allSheets && allSheets.length > 20) {
    console.log(`  ... and ${allSheets.length - 20} more`)
  }

  // Check if these are duplicates
  const nameCount = new Map()
  allSheets?.forEach(s => {
    const count = nameCount.get(s.name) || 0
    nameCount.set(s.name, count + 1)
  })

  const duplicates = Array.from(nameCount.entries())
    .filter(([name, count]) => count > 1)
    .sort((a, b) => b[1] - a[1])

  if (duplicates.length > 0) {
    console.log(`\n⚠️  Found ${duplicates.length} duplicate sheet names:`)
    duplicates.slice(0, 10).forEach(([name, count]) => {
      console.log(`  - "${name}": ${count} copies`)
    })
  }
}
