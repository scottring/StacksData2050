import { supabase } from './src/migration/supabase-client.js'

console.log('=== Comprehensive Duplicate Analysis ===\n')

// Analyze ALL companies for duplicates
const { data: companies } = await supabase
  .from('companies')
  .select('id, name')
  .order('name')

console.log('Checking all companies for duplicate sheets...\n')

interface CompanyDuplicateStats {
  company_name: string
  total_sheets: number
  unique_names: number
  duplicate_groups: number
  duplicate_sheets: number
  would_reduce_to: number
}

const allCompanyStats: CompanyDuplicateStats[] = []

for (const company of companies || []) {
  const { data: sheets } = await supabase
    .from('sheets')
    .select('id, name, created_at, modified_at, new_status')
    .eq('company_id', company.id)

  if (!sheets || sheets.length === 0) continue

  // Group by name
  const nameGroups = new Map<string, typeof sheets>()
  sheets.forEach(s => {
    const existing = nameGroups.get(s.name) || []
    existing.push(s)
    nameGroups.set(s.name, existing)
  })

  const duplicates = Array.from(nameGroups.entries())
    .filter(([name, sheets]) => sheets.length > 1)

  if (duplicates.length > 0) {
    const totalDuplicateSheets = duplicates.reduce((sum, [, sheets]) => sum + sheets.length, 0)
    const wouldReduceTo = nameGroups.size

    allCompanyStats.push({
      company_name: company.name,
      total_sheets: sheets.length,
      unique_names: nameGroups.size,
      duplicate_groups: duplicates.length,
      duplicate_sheets: totalDuplicateSheets,
      would_reduce_to: wouldReduceTo
    })

    console.log(`${company.name}:`)
    console.log(`  Total sheets: ${sheets.length}`)
    console.log(`  Unique names: ${nameGroups.size}`)
    console.log(`  Duplicate groups: ${duplicates.length}`)
    console.log(`  Would reduce to: ${wouldReduceTo} (remove ${sheets.length - wouldReduceTo})`)
    console.log('')
  }
}

// Sort by most duplicates
allCompanyStats.sort((a, b) =>
  (b.total_sheets - b.would_reduce_to) - (a.total_sheets - a.would_reduce_to)
)

console.log('\n=== Summary: Companies with Most Duplicates ===\n')
allCompanyStats.slice(0, 10).forEach((stats, i) => {
  const reduction = stats.total_sheets - stats.would_reduce_to
  const pct = Math.round((reduction / stats.total_sheets) * 100)
  console.log(`${i + 1}. ${stats.company_name}`)
  console.log(`   ${stats.total_sheets} → ${stats.would_reduce_to} sheets (-${reduction}, ${pct}%)`)
})

console.log('\n\n=== Analyzing Request/Response Lifecycle ===\n')

// Check if we have a status field on sheets that indicates request status
const { data: sampleSheets } = await supabase
  .from('sheets')
  .select('id, name, new_status, created_at, modified_at')
  .limit(10)

console.log('Sample sheet statuses:')
sampleSheets?.forEach(s => {
  console.log(`  ${s.name}: status="${s.new_status}", modified=${s.modified_at}`)
})

// Check status distribution
const { data: statusCounts } = await supabase
  .from('sheets')
  .select('new_status')

const statusMap = new Map<string | null, number>()
statusCounts?.forEach(s => {
  const status = s.new_status || 'null'
  statusMap.set(status, (statusMap.get(status) || 0) + 1)
})

console.log('\n\nSheet status distribution:')
Array.from(statusMap.entries())
  .sort((a, b) => b[1] - a[1])
  .forEach(([status, count]) => {
    console.log(`  ${status}: ${count}`)
  })

// Analyze UPM specifically - check for answer counts per sheet
console.log('\n\n=== UPM Duplicate Analysis with Answer Counts ===\n')

const { data: upm } = await supabase
  .from('companies')
  .select('id, name')
  .eq('name', 'UPM')
  .single()

if (upm) {
  const { data: upmSheets } = await supabase
    .from('sheets')
    .select('id, name, created_at, modified_at, new_status')
    .eq('company_id', upm.id)

  // Get answer counts for all UPM sheets
  console.log('Fetching answer counts for UPM sheets...')
  const sheetIds = upmSheets?.map(s => s.id) || []

  const { data: answerCounts } = await supabase
    .from('answers')
    .select('sheet_id')
    .in('sheet_id', sheetIds)

  const answerCountMap = new Map<string, number>()
  answerCounts?.forEach(a => {
    answerCountMap.set(a.sheet_id, (answerCountMap.get(a.sheet_id) || 0) + 1)
  })

  // Group by name and analyze
  const nameGroups = new Map<string, typeof upmSheets>()
  upmSheets?.forEach(s => {
    const existing = nameGroups.get(s.name) || []
    existing.push(s)
    nameGroups.set(s.name, existing)
  })

  const duplicates = Array.from(nameGroups.entries())
    .filter(([name, sheets]) => sheets.length > 1)
    .sort((a, b) => b[1].length - a[1].length)

  console.log(`\nTop 20 UPM duplicates with answer counts:\n`)

  for (const [name, sheets] of duplicates.slice(0, 20)) {
    console.log(`"${name}" (${sheets.length} copies):`)

    const sorted = sheets.sort((a, b) => {
      const dateA = new Date(a.modified_at || a.created_at || 0).getTime()
      const dateB = new Date(b.modified_at || b.created_at || 0).getTime()
      return dateB - dateA
    })

    sorted.forEach((sheet, idx) => {
      const answerCount = answerCountMap.get(sheet.id) || 0
      const label = idx === 0 ? 'NEWEST' : `OLD #${idx}`
      console.log(`  ${label}: ${sheet.id}`)
      console.log(`    Status: ${sheet.new_status || 'null'}`)
      console.log(`    Answers: ${answerCount}`)
      console.log(`    Modified: ${sheet.modified_at}`)
      console.log(`    Created: ${sheet.created_at}`)
    })
    console.log('')
  }

  // Analysis: Which criteria would keep the most complete data?
  console.log('\n=== Duplicate Resolution Strategy Analysis ===\n')

  let newestWins = 0
  let mostAnswersWins = 0
  let statusWins = 0
  let conflicts = 0

  for (const [name, sheets] of duplicates) {
    if (sheets.length <= 1) continue

    // Sort by modified_at (newest first)
    const byDate = [...sheets].sort((a, b) => {
      const dateA = new Date(a.modified_at || a.created_at || 0).getTime()
      const dateB = new Date(b.modified_at || b.created_at || 0).getTime()
      return dateB - dateA
    })

    // Sort by answer count (most first)
    const byAnswers = [...sheets].sort((a, b) => {
      const countA = answerCountMap.get(a.id) || 0
      const countB = answerCountMap.get(b.id) || 0
      return countB - countA
    })

    // Sort by status (completed/approved first)
    const byStatus = [...sheets].sort((a, b) => {
      const statusA = a.new_status === 'completed' || a.new_status === 'approved' ? 1 : 0
      const statusB = b.new_status === 'completed' || b.new_status === 'approved' ? 1 : 0
      return statusB - statusA
    })

    const newestId = byDate[0].id
    const mostAnswersId = byAnswers[0].id
    const bestStatusId = byStatus[0].id

    // Check if they agree
    if (newestId === mostAnswersId && mostAnswersId === bestStatusId) {
      newestWins++
      mostAnswersWins++
      statusWins++
    } else if (newestId === mostAnswersId) {
      newestWins++
      mostAnswersWins++
    } else if (newestId === bestStatusId) {
      newestWins++
      statusWins++
    } else if (mostAnswersId === bestStatusId) {
      mostAnswersWins++
      statusWins++
    } else {
      conflicts++
    }
  }

  const total = duplicates.length
  console.log(`Strategy Agreement Analysis (${total} duplicate groups):`)
  console.log(`  All agree: ${newestWins - conflicts}`)
  console.log(`  Newest = Most Answers: ${newestWins}`)
  console.log(`  Newest = Best Status: ${statusWins}`)
  console.log(`  Most Answers = Best Status: ${mostAnswersWins}`)
  console.log(`  Conflicts (all differ): ${conflicts}`)
  console.log(`\nRecommendation: Use composite strategy based on conflicts`)
}

console.log('\n\n=== PROPOSED STRATEGY ===\n')
console.log('For each duplicate group, keep the sheet that:')
console.log('  1. Has status "completed" or "approved" (if any)')
console.log('  2. Among those, has the most answers')
console.log('  3. If tie, use newest modified_at')
console.log('')
console.log('This ensures we keep the most complete, accepted responses.')
