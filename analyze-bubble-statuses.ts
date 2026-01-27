import { supabase } from './src/migration/supabase-client.js'

console.log('=== Bubble Status System Analysis ===\n')

// Get all sheet_statuses records
const { data: allStatuses } = await supabase
  .from('sheet_statuses')
  .select('status, sheet_id, version, father_of_sheet_id')

console.log(`Total sheet_statuses records: ${allStatuses?.length}\n`)

// Status distribution
const statusMap = new Map()
allStatuses?.forEach(s => {
  const status = s.status || 'null'
  statusMap.set(status, (statusMap.get(status) || 0) + 1)
})

console.log('sheet_statuses.status distribution:')
Array.from(statusMap.entries())
  .sort((a, b) => b[1] - a[1])
  .forEach(([status, count]) => {
    const pct = ((count / (allStatuses?.length || 1)) * 100).toFixed(1)
    console.log(`  ${status}: ${count} (${pct}%)`)
  })

// Check version distribution
console.log('\n\nVersion distribution:')
const versionMap = new Map()
allStatuses?.forEach(s => {
  const version = s.version || 0
  versionMap.set(version, (versionMap.get(version) || 0) + 1)
})

Array.from(versionMap.entries())
  .sort((a, b) => a[0] - b[0])
  .slice(0, 10)
  .forEach(([version, count]) => {
    console.log(`  Version ${version}: ${count} sheets`)
  })

// Find sheets with multiple versions
const sheetVersions = new Map()
allStatuses?.forEach(s => {
  const key = s.father_of_sheet_id
  const existing = sheetVersions.get(key) || []
  existing.push(s)
  sheetVersions.set(key, existing)
})

const multiVersion = Array.from(sheetVersions.entries())
  .filter(([key, versions]) => versions.length > 1)
  .sort((a, b) => b[1].length - a[1].length)

console.log(`\n\nSheets with multiple versions: ${multiVersion.length}`)
console.log('Top 10 by version count:')
multiVersion.slice(0, 10).forEach(([fatherSheetId, versions]) => {
  const sheet = versions[0]
  console.log(`  ${sheet.sheet_name}: ${versions.length} versions`)
  versions.forEach(v => {
    console.log(`    v${v.version}: ${v.status}`)
  })
})

// Key insight: father_of_sheet_id groups versions together
console.log('\n\n=== KEY INSIGHT ===')
console.log('Bubble uses versioning system:')
console.log('  - father_of_sheet_id: Links all versions of same product request')
console.log('  - version: Incremental version number')
console.log('  - status: Approved, Rejected, Canceled, etc.')
console.log('\nFor deduplication:')
console.log('  1. Group by father_of_sheet_id')
console.log('  2. Keep highest version number with status="Approved"')
console.log('  3. If no Approved, keep highest version')
