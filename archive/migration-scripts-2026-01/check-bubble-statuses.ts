import { supabase } from './src/migration/supabase-client.js'

console.log('=== Checking Bubble Status Fields ===\n')

// Check what status-related fields exist on sheets
const { data: sampleSheets } = await supabase
  .from('sheets')
  .select('*')
  .limit(5)

if (sampleSheets && sampleSheets.length > 0) {
  console.log('Status-related columns:')
  const columns = Object.keys(sampleSheets[0])
  columns.forEach(col => {
    if (col.includes('status') || col.includes('Status')) {
      console.log(`  - ${col}`)
    }
  })
}

// Check new_status distribution
const { data: newStatuses } = await supabase
  .from('sheets')
  .select('new_status')

const newStatusMap = new Map()
newStatuses?.forEach(s => {
  const status = s.new_status || 'null'
  newStatusMap.set(status, (newStatusMap.get(status) || 0) + 1)
})

console.log('\nnew_status distribution:')
Array.from(newStatusMap.entries())
  .sort((a, b) => b[1] - a[1])
  .forEach(([status, count]) => {
    const pct = ((count / (newStatuses?.length || 1)) * 100).toFixed(1)
    console.log(`  ${status}: ${count} (${pct}%)`)
  })

// Check sheet_statuses table
console.log('\n=== Checking sheet_statuses Table ===')

const { data: sheetStatuses, error } = await supabase
  .from('sheet_statuses')
  .select('*')
  .limit(5)

if (error) {
  console.log('Error:', error.message)
} else {
  console.log('Sample records:', JSON.stringify(sheetStatuses, null, 2))
}
