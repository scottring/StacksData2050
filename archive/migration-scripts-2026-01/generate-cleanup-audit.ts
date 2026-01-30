import { supabase } from './src/migration/supabase-client.js'
import { writeFileSync } from 'fs'

console.log('=== Generating Cleanup Audit Report ===\n')

interface SheetAuditRecord {
  sheet_id: string
  sheet_name: string
  company_name: string
  bubble_status: string | null
  version: number | null
  new_status: string | null
  answer_count: number
  has_chemicals: boolean
  created_at: string
  modified_at: string
  score: number
  decision: 'KEEP' | 'DELETE'
  reason: string
  duplicate_group: string
}

const auditRecords: SheetAuditRecord[] = []

// Phase 1: Stacks Data test companies
console.log('Phase 1: Identifying Stacks Data test sheets...')

const { data: stacksCompanies } = await supabase
  .from('companies')
  .select('id, name')
  .ilike('name', '%stacks%')

let stacksSheetCount = 0
for (const company of stacksCompanies || []) {
  const { data: sheets } = await supabase
    .from('sheets')
    .select('id, name, created_at, modified_at, new_status')
    .eq('company_id', company.id)

  for (const sheet of sheets || []) {
    auditRecords.push({
      sheet_id: sheet.id,
      sheet_name: sheet.name,
      company_name: company.name,
      bubble_status: null,
      version: null,
      new_status: sheet.new_status,
      answer_count: 0,
      has_chemicals: false,
      created_at: sheet.created_at,
      modified_at: sheet.modified_at,
      score: 0,
      decision: 'DELETE',
      reason: 'Stacks Data test company',
      duplicate_group: 'N/A'
    })
    stacksSheetCount++
  }
}

console.log(`  Found ${stacksSheetCount} Stacks Data test sheets\n`)

// Phase 2: Test/Example sheets
console.log('Phase 2: Identifying test/example sheets...')

const { data: allSheets } = await supabase
  .from('sheets')
  .select('id, name, company_id, created_at, modified_at, new_status, companies!sheets_company_id_fkey(name)')

const testSheets = (allSheets || []).filter(s => {
  const isStacksCompany = stacksCompanies?.some(c => c.id === s.company_id)
  if (isStacksCompany) return false // Already handled in Phase 1

  const name = s.name?.toLowerCase() || ''
  return name.includes('test') || name.includes('example') || name.includes('stacks')
})

console.log(`  Found ${testSheets.length} test/example sheets\n`)

for (const sheet of testSheets) {
  const companyName = (sheet.companies as any)?.name || 'Unknown'
  auditRecords.push({
    sheet_id: sheet.id,
    sheet_name: sheet.name,
    company_name: companyName,
    bubble_status: null,
    version: null,
    new_status: sheet.new_status,
    answer_count: 0,
    has_chemicals: false,
    created_at: sheet.created_at,
    modified_at: sheet.modified_at,
    score: 0,
    decision: 'DELETE',
    reason: 'Test/example sheet name',
    duplicate_group: 'N/A'
  })
}

// Phase 3: Smart deduplication with Bubble statuses
console.log('Phase 3: Analyzing duplicates with Bubble statuses...\n')

// Get all companies
const { data: companies } = await supabase
  .from('companies')
  .select('id, name')
  .order('name')

let totalDuplicateSheets = 0
let totalKeptSheets = 0

for (const company of companies || []) {
  // Skip Stacks companies
  const isStacksCompany = stacksCompanies?.some(c => c.id === company.id)
  if (isStacksCompany) continue

  const { data: sheets } = await supabase
    .from('sheets')
    .select('id, name, created_at, modified_at, new_status')
    .eq('company_id', company.id)

  if (!sheets || sheets.length === 0) continue

  // Group by name
  const nameGroups = new Map<string, typeof sheets>()
  sheets.forEach(s => {
    // Skip if already marked for deletion in Phase 2
    if (testSheets.some(t => t.id === s.id)) return

    const existing = nameGroups.get(s.name) || []
    existing.push(s)
    nameGroups.set(s.name, existing)
  })

  const duplicates = Array.from(nameGroups.entries())
    .filter(([name, sheets]) => sheets.length > 1)

  if (duplicates.length === 0) continue

  console.log(`${company.name}: ${duplicates.length} duplicate groups`)

  // Fetch data for all sheets in this company
  const allSheetIds = sheets.map(s => s.id)

  // Get answer counts
  const { data: answers } = await supabase
    .from('answers')
    .select('sheet_id')
    .in('sheet_id', allSheetIds)

  const answerCounts = new Map<string, number>()
  answers?.forEach(a => {
    answerCounts.set(a.sheet_id, (answerCounts.get(a.sheet_id) || 0) + 1)
  })

  // Get chemical data
  const { data: chemicals } = await supabase
    .from('sheet_chemicals')
    .select('sheet_id')
    .in('sheet_id', allSheetIds)

  const hasChemicals = new Set(chemicals?.map(c => c.sheet_id) || [])

  // Get Bubble statuses
  const { data: statuses } = await supabase
    .from('sheet_statuses')
    .select('sheet_id, status, version')
    .in('sheet_id', allSheetIds)

  const statusMap = new Map<string, { status: string, version: number }>()
  statuses?.forEach(s => {
    statusMap.set(s.sheet_id, { status: s.status, version: s.version })
  })

  // Process each duplicate group
  for (const [name, groupSheets] of duplicates) {
    totalDuplicateSheets += groupSheets.length

    // Score each sheet
    const scored = groupSheets.map(sheet => {
      let score = 0
      const reasons: string[] = []

      // Priority 1: Bubble status (100 points)
      const statusInfo = statusMap.get(sheet.id)
      if (statusInfo) {
        if (statusInfo.status === 'Approved') {
          score += 100
          reasons.push('Bubble: Approved')
        } else if (statusInfo.status === 'Ready for review') {
          score += 50
          reasons.push('Bubble: Ready for review')
        } else if (statusInfo.status === 'Under review') {
          score += 25
          reasons.push('Bubble: Under review')
        } else if (statusInfo.status === 'Rejected' || statusInfo.status === 'Canceled') {
          score += 0
          reasons.push(`Bubble: ${statusInfo.status}`)
        }

        // Version bonus (+10 per version)
        score += (statusInfo.version || 1) * 10
        if (statusInfo.version > 1) {
          reasons.push(`v${statusInfo.version}`)
        }
      } else {
        // Fallback to new_status if no Bubble status
        if (sheet.new_status === 'approved') {
          score += 100
          reasons.push('approved')
        } else if (sheet.new_status === 'completed') {
          score += 90
          reasons.push('completed')
        }
      }

      // Priority 2: Chemical data (50 points)
      if (hasChemicals.has(sheet.id)) {
        score += 50
        reasons.push('has chemicals')
      }

      // Priority 3: Answer count (up to 50 points)
      const answerCount = answerCounts.get(sheet.id) || 0
      const answerScore = Math.min(answerCount, 50)
      score += answerScore
      if (answerCount > 0) {
        reasons.push(`${answerCount} answers`)
      }

      // Priority 4: Recency (up to 10 points)
      const ageMs = Date.now() - new Date(sheet.modified_at).getTime()
      const ageDays = ageMs / (1000 * 60 * 60 * 24)
      const recencyScore = Math.max(0, 10 - (ageDays / 365) * 10)
      score += recencyScore

      if (ageDays < 30) {
        reasons.push('recent')
      }

      return {
        sheet,
        score,
        reasons,
        statusInfo,
        answerCount
      }
    })

    // Sort by score descending
    scored.sort((a, b) => b.score - a.score)

    const winner = scored[0]
    totalKeptSheets++

    // Add to audit records
    scored.forEach((item, idx) => {
      auditRecords.push({
        sheet_id: item.sheet.id,
        sheet_name: item.sheet.name,
        company_name: company.name,
        bubble_status: item.statusInfo?.status || null,
        version: item.statusInfo?.version || null,
        new_status: item.sheet.new_status,
        answer_count: item.answerCount,
        has_chemicals: hasChemicals.has(item.sheet.id),
        created_at: item.sheet.created_at,
        modified_at: item.sheet.modified_at,
        score: item.score,
        decision: idx === 0 ? 'KEEP' : 'DELETE',
        reason: idx === 0
          ? `Best: ${item.reasons.join(', ')}`
          : `Duplicate of winner: ${item.reasons.join(', ')}`,
        duplicate_group: `${company.name}/${name}`
      })
    })
  }
}

console.log(`\n  Analyzed duplicate groups`)
console.log(`  Total duplicate sheets: ${totalDuplicateSheets}`)
console.log(`  Sheets to keep: ${totalKeptSheets}`)
console.log(`  Sheets to delete: ${totalDuplicateSheets - totalKeptSheets}`)

// Generate CSV
console.log('\n\nGenerating CSV report...')

const csvHeader = [
  'sheet_id',
  'sheet_name',
  'company_name',
  'bubble_status',
  'version',
  'new_status',
  'answer_count',
  'has_chemicals',
  'created_at',
  'modified_at',
  'score',
  'decision',
  'reason',
  'duplicate_group'
].join(',')

const csvRows = auditRecords.map(r => [
  r.sheet_id,
  `"${r.sheet_name.replace(/"/g, '""')}"`,
  `"${r.company_name.replace(/"/g, '""')}"`,
  r.bubble_status || '',
  r.version || '',
  r.new_status || '',
  r.answer_count,
  r.has_chemicals ? 'Yes' : 'No',
  r.created_at,
  r.modified_at,
  r.score,
  r.decision,
  `"${r.reason.replace(/"/g, '""')}"`,
  `"${r.duplicate_group.replace(/"/g, '""')}"`
].join(','))

const csv = [csvHeader, ...csvRows].join('\n')

const filename = 'cleanup-audit-report.csv'
writeFileSync(filename, csv)

console.log(`\n✓ CSV report saved: ${filename}`)

// Summary
console.log('\n\n=== CLEANUP SUMMARY ===\n')
console.log(`Total sheets to delete: ${auditRecords.filter(r => r.decision === 'DELETE').length}`)
console.log(`Total sheets to keep: ${auditRecords.filter(r => r.decision === 'KEEP').length}`)
console.log('\nBreakdown:')
console.log(`  Phase 1 (Stacks Data): ${stacksSheetCount} sheets`)
console.log(`  Phase 2 (Test/Example): ${testSheets.length} sheets`)
console.log(`  Phase 3 (Duplicates): ${totalDuplicateSheets - totalKeptSheets} sheets`)
console.log(`\nTotal: ${stacksSheetCount + testSheets.length + (totalDuplicateSheets - totalKeptSheets)} sheets to delete`)
