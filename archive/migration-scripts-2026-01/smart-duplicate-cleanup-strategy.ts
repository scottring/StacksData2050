import { supabase } from './src/migration/supabase-client.js'

console.log('=== Smart Duplicate Cleanup Strategy ===\n')
console.log('Goal: Keep the most complete, accepted version of each duplicate sheet\n')

// Get ALL companies with significant duplicates (>5% reduction)
const { data: companies } = await supabase
  .from('companies')
  .select('id, name')
  .order('name')

interface DuplicateGroup {
  name: string
  sheets: Array<{
    id: string
    name: string
    status: string | null
    answer_count: number
    created_at: string
    modified_at: string
    has_chemicals: boolean
  }>
  recommendation: {
    keep_id: string
    keep_reason: string
    delete_ids: string[]
  }
}

const allDuplicateGroups: Map<string, DuplicateGroup[]> = new Map()

console.log('Analyzing companies...\n')

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

  if (duplicates.length === 0) continue

  const reductionPct = ((sheets.length - nameGroups.size) / sheets.length) * 100
  if (reductionPct < 5) continue // Skip companies with < 5% duplication

  console.log(`${company.name}: ${sheets.length} → ${nameGroups.size} sheets (-${Math.round(reductionPct)}%)`)

  // Analyze each duplicate group
  const companyDuplicateGroups: DuplicateGroup[] = []

  for (const [name, groupSheets] of duplicates.slice(0, 5)) { // Top 5 for each company
    // Get answer counts
    const sheetIds = groupSheets.map(s => s.id)
    const { data: answers } = await supabase
      .from('answers')
      .select('sheet_id')
      .in('sheet_id', sheetIds)

    const answerCounts = new Map<string, number>()
    answers?.forEach(a => {
      answerCounts.set(a.sheet_id, (answerCounts.get(a.sheet_id) || 0) + 1)
    })

    // Check for chemicals
    const { data: chemicals } = await supabase
      .from('sheet_chemicals')
      .select('sheet_id')
      .in('sheet_id', sheetIds)

    const hasChemicals = new Set(chemicals?.map(c => c.sheet_id) || [])

    // Build full sheet data
    const fullSheets = groupSheets.map(s => ({
      id: s.id,
      name: s.name,
      status: s.new_status,
      answer_count: answerCounts.get(s.id) || 0,
      created_at: s.created_at,
      modified_at: s.modified_at,
      has_chemicals: hasChemicals.has(s.id)
    }))

    // Determine which to keep using composite strategy
    const recommendation = determineWhichToKeep(fullSheets)

    companyDuplicateGroups.push({
      name,
      sheets: fullSheets,
      recommendation
    })
  }

  allDuplicateGroups.set(company.name, companyDuplicateGroups)
}

console.log('\n\n=== Detailed Analysis of Top Duplicates ===\n')

for (const [companyName, groups] of allDuplicateGroups) {
  console.log(`\n${companyName}:`)

  for (const group of groups) {
    console.log(`\n  "${group.name}" (${group.sheets.length} copies):`)

    // Sort to show recommended keep first
    const sorted = [
      group.sheets.find(s => s.id === group.recommendation.keep_id)!,
      ...group.sheets.filter(s => s.id !== group.recommendation.keep_id)
    ]

    sorted.forEach((sheet, idx) => {
      const label = idx === 0 ? '✓ KEEP' : '✗ DELETE'
      console.log(`    ${label}: ${sheet.id}`)
      console.log(`      Status: ${sheet.status || 'draft'}`)
      console.log(`      Answers: ${sheet.answer_count}`)
      console.log(`      Chemicals: ${sheet.has_chemicals ? 'Yes' : 'No'}`)
      console.log(`      Modified: ${sheet.modified_at}`)
    })

    console.log(`    Reason: ${group.recommendation.keep_reason}`)
  }
}

// Summary statistics
console.log('\n\n=== CLEANUP SUMMARY ===\n')

let totalSheetsToDelete = 0
let totalDuplicateGroups = 0

for (const [companyName, groups] of allDuplicateGroups) {
  const sheetsToDelete = groups.reduce((sum, g) => sum + g.recommendation.delete_ids.length, 0)
  totalSheetsToDelete += sheetsToDelete
  totalDuplicateGroups += groups.length

  console.log(`${companyName}:`)
  console.log(`  Duplicate groups analyzed: ${groups.length}`)
  console.log(`  Sheets to delete: ${sheetsToDelete}`)
}

console.log(`\nTotal across sampled groups:`)
console.log(`  Groups: ${totalDuplicateGroups}`)
console.log(`  Sheets to delete: ${totalSheetsToDelete}`)

console.log('\n\n=== PROPOSED CLEANUP STRATEGY ===\n')
console.log('For each duplicate group, keep the sheet that scores highest on:')
console.log('  Priority 1: Status "approved" > "completed" > others')
console.log('  Priority 2: Has chemicals (actual product data)')
console.log('  Priority 3: Most answers (most complete)')
console.log('  Priority 4: Newest modified_at (most recent update)')
console.log('')
console.log('This ensures we preserve:')
console.log('  ✓ Approved/completed responses over drafts')
console.log('  ✓ Sheets with chemical compliance data')
console.log('  ✓ Most complete answer sets')
console.log('  ✓ Most recently updated data')

// Helper function to determine which sheet to keep
function determineWhichToKeep(sheets: DuplicateGroup['sheets']) {
  // Score each sheet
  const scored = sheets.map(sheet => {
    let score = 0
    let reasons: string[] = []

    // Priority 1: Status (approved=100, completed=90, draft=0)
    if (sheet.status === 'approved') {
      score += 100
      reasons.push('approved status')
    } else if (sheet.status === 'completed') {
      score += 90
      reasons.push('completed status')
    }

    // Priority 2: Has chemicals (50 points)
    if (sheet.has_chemicals) {
      score += 50
      reasons.push('has chemical data')
    }

    // Priority 3: Answer count (1 point per answer, max 50)
    const answerScore = Math.min(sheet.answer_count, 50)
    score += answerScore
    if (sheet.answer_count > 0) {
      reasons.push(`${sheet.answer_count} answers`)
    }

    // Priority 4: Recency (newer = better, scale 0-10)
    const ageMs = Date.now() - new Date(sheet.modified_at).getTime()
    const ageDays = ageMs / (1000 * 60 * 60 * 24)
    const recencyScore = Math.max(0, 10 - (ageDays / 365) * 10) // Decay over 1 year
    score += recencyScore

    if (ageDays < 30) {
      reasons.push('recently updated')
    }

    return { sheet, score, reasons }
  })

  // Sort by score descending
  scored.sort((a, b) => b.score - a.score)

  const winner = scored[0]

  return {
    keep_id: winner.sheet.id,
    keep_reason: winner.reasons.join(', ') || 'default (newest)',
    delete_ids: scored.slice(1).map(s => s.sheet.id)
  }
}
