/**
 * compare-sheet.ts
 *
 * Compares answers for a single sheet between Bubble.io and Supabase.
 * Usage: npx tsx compare-sheet.ts <supabase-sheet-id>
 *        npx tsx compare-sheet.ts <bubble-sheet-id>
 *
 * Outputs: match count, mismatches with question numbers, missing answers.
 */

import dotenv from 'dotenv'
dotenv.config()

import { createClient } from '@supabase/supabase-js'

const BUBBLE_BASE_URL = process.env.BUBBLE_API_URL || 'https://app.stacksdata.com/version-live'
const BUBBLE_API_TOKEN = process.env.BUBBLE_API_TOKEN!
const SUPABASE_URL = process.env.SUPABASE_URL!
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

// ── Bubble helpers ─────────────────────────────────────────────────────────

async function fetchBubbleAll(endpoint: string, constraints: any[] = []): Promise<any[]> {
  const PAGE_SIZE = 100
  let cursor = 0
  const results: any[] = []

  while (true) {
    const url = new URL(`${BUBBLE_BASE_URL}/api/1.1/obj/${endpoint}`)
    url.searchParams.set('limit', String(PAGE_SIZE))
    url.searchParams.set('cursor', String(cursor))
    if (constraints.length > 0) {
      url.searchParams.set('constraints', JSON.stringify(constraints))
    }

    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${BUBBLE_API_TOKEN}` },
    })

    if (!res.ok) {
      const text = await res.text()
      throw new Error(`Bubble API error ${res.status}: ${text}`)
    }

    const json = (await res.json()) as any
    const batch: any[] = json.response?.results ?? []
    results.push(...batch)

    const remaining = json.response?.remaining ?? 0
    if (remaining <= 0 || batch.length === 0) break
    cursor += PAGE_SIZE
  }

  return results
}

// ── Supabase helpers ───────────────────────────────────────────────────────

async function getSheetBySupabaseId(id: string) {
  const { data, error } = await supabase
    .from('sheets')
    .select('id, name, bubble_id, company_id')
    .eq('id', id)
    .single()
  if (error) throw new Error(`Sheet not found: ${error.message}`)
  return data
}

async function getSheetByBubbleId(bubbleId: string) {
  const { data, error } = await supabase
    .from('sheets')
    .select('id, name, bubble_id, company_id')
    .eq('bubble_id', bubbleId)
    .single()
  if (error) throw new Error(`Sheet not found by bubble_id: ${error.message}`)
  return data
}

async function getSupabaseAnswers(sheetId: string) {
  const { data, error } = await supabase
    .from('answers')
    .select(`
      id,
      question_id,
      text_value,
      additional_notes,
      number_value,
      boolean_value,
      date_value,
      choice_id,
      list_table_row_id
    `)
    .eq('sheet_id', sheetId)
    .is('list_table_row_id', null)

  if (error) throw new Error(`Failed to fetch Supabase answers: ${error.message}`)
  return data ?? []
}

async function getQuestionsByBubbleId(bubbleIds: string[]) {
  if (bubbleIds.length === 0) return new Map<string, any>()
  // Fetch in batches of 200 to avoid URL length limits
  const result = new Map<string, any>()
  for (let i = 0; i < bubbleIds.length; i += 200) {
    const batch = bubbleIds.slice(i, i + 200)
    const { data } = await supabase
      .from('questions')
      .select('id, bubble_id, name, content, section_sort_number, subsection_sort_number, order_number')
      .in('bubble_id', batch)
    data?.forEach(q => result.set(q.bubble_id, q))
  }
  return result
}

async function getChoicesByBubbleId(bubbleIds: string[]) {
  if (bubbleIds.length === 0) return new Map<string, any>()
  const result = new Map<string, any>()
  for (let i = 0; i < bubbleIds.length; i += 200) {
    const batch = bubbleIds.slice(i, i + 200)
    const { data } = await supabase
      .from('choices')
      .select('id, bubble_id, content')
      .in('bubble_id', batch)
    data?.forEach(c => result.set(c.bubble_id, c))
  }
  return result
}

// ── Normalisation ──────────────────────────────────────────────────────────

function norm(v: string | null | undefined): string {
  if (v == null) return ''
  return v.trim().replace(/\s+/g, ' ')
}

function normBool(v: boolean | null | undefined): string {
  if (v == null) return ''
  return v ? 'true' : 'false'
}

function normNum(v: number | null | undefined): string {
  if (v == null) return ''
  return String(v)
}

// ── Main ───────────────────────────────────────────────────────────────────

async function main() {
  const arg = process.argv[2]
  if (!arg) {
    console.error('Usage: npx tsx compare-sheet.ts <supabase-sheet-id-or-bubble-id>')
    process.exit(1)
  }

  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(arg)

  let sheet: { id: string; name: string; bubble_id: string | null; company_id: string | null }
  if (isUUID) {
    sheet = await getSheetBySupabaseId(arg)
  } else {
    sheet = await getSheetByBubbleId(arg)
  }

  const bubbleSheetId = sheet.bubble_id
  if (!bubbleSheetId) {
    console.error('❌ This sheet has no bubble_id — it was not migrated from Bubble.')
    process.exit(1)
  }

  console.log(`\n📋  Sheet: ${sheet.name}`)
  console.log(`    Supabase ID : ${sheet.id}`)
  console.log(`    Bubble ID   : ${bubbleSheetId}`)
  console.log()

  // ── Fetch answers ──────────────────────────────────────────────────────

  process.stdout.write('Fetching Bubble answers…   ')
  const bubbleAnswers = await fetchBubbleAll('answer', [
    { key: 'Sheet', constraint_type: 'equals', value: bubbleSheetId },
  ])
  console.log(`${bubbleAnswers.length} found`)

  // Filter out list-table answers (they have 'List Table Row' set)
  const bubbleNonList = bubbleAnswers.filter(a => !a['List Table Row'])
  console.log(`    (${bubbleNonList.length} non-list-table)`)

  process.stdout.write('Fetching Supabase answers… ')
  const supabaseAnswers = await getSupabaseAnswers(sheet.id)
  console.log(`${supabaseAnswers.length} found`)

  // ── Build question lookup maps ─────────────────────────────────────────

  // Collect all unique question bubble_ids referenced in Bubble answers
  const bubbleQIds = new Set<string>()
  for (const ba of bubbleNonList) {
    const qId = ba['Originating Question'] || ba['Parent Question']
    if (qId) bubbleQIds.add(qId)
  }

  process.stdout.write(`Looking up ${bubbleQIds.size} questions… `)
  const questionsByBubbleId = await getQuestionsByBubbleId([...bubbleQIds])
  console.log(`${questionsByBubbleId.size} found in Supabase`)

  // Build question_id → question map from Supabase for answer labeling
  const questionById = new Map<string, any>()
  for (const q of questionsByBubbleId.values()) {
    questionById.set(q.id, q)
  }

  // Supabase answers keyed by question_id
  const supabaseByQId = new Map<string, any>()
  for (const a of supabaseAnswers) {
    if (a.question_id) supabaseByQId.set(a.question_id, a)
  }

  // Collect choice bubble_ids from Bubble answers
  const bubbleChoiceIds = new Set<string>()
  for (const ba of bubbleNonList) {
    if (ba.Choice) bubbleChoiceIds.add(ba.Choice)
  }

  process.stdout.write(`Looking up ${bubbleChoiceIds.size} choices… `)
  const choicesByBubbleId = await getChoicesByBubbleId([...bubbleChoiceIds])
  console.log(`${choicesByBubbleId.size} found`)

  // Supabase choices by id (for reverse lookup)
  const supabaseChoiceIds = new Set<string>()
  for (const a of supabaseAnswers) {
    if (a.choice_id) supabaseChoiceIds.add(a.choice_id)
  }
  // Fetch supabase choice content
  const supabaseChoiceMap = new Map<string, string>() // id → content
  if (supabaseChoiceIds.size > 0) {
    const { data: cdata } = await supabase
      .from('choices')
      .select('id, content, bubble_id')
      .in('id', [...supabaseChoiceIds])
    cdata?.forEach(c => supabaseChoiceMap.set(c.id, c.content || c.bubble_id || c.id))
  }

  console.log()

  // ── Compare ────────────────────────────────────────────────────────────

  let matched = 0
  let mismatched = 0
  let choiceUnresolved = 0
  let missingInSupabase = 0
  let noQuestionMapping = 0

  const mismatches: string[] = []
  const choiceWarnings: string[] = []
  const missing: string[] = []

  function questionLabel(q: any): string {
    if (!q) return '?'
    const num = [q.section_sort_number, q.subsection_sort_number, q.order_number]
      .filter(n => n != null).join('.')
    return num ? `Q${num}` : (q.name || q.content || q.id)?.slice(0, 40)
  }

  for (const ba of bubbleNonList) {
    const qBubbleId = ba['Originating Question'] || ba['Parent Question']
    if (!qBubbleId) continue

    const q = questionsByBubbleId.get(qBubbleId)
    if (!q) {
      noQuestionMapping++
      continue
    }

    const label = questionLabel(q)
    const sa = supabaseByQId.get(q.id)

    if (!sa) {
      // Check if there's any value in Bubble to report
      const hasValue = ba.text || ba['text-area'] || ba.Number != null || ba.Boolean != null || ba.Choice
      if (hasValue) {
        missing.push(`${label}: text="${ba.text || ba['text-area'] || ''}" bool=${ba.Boolean ?? ''} num=${ba.Number ?? ''} choice="${ba.Choice || ''}"`)
        missingInSupabase++
      }
      continue
    }

    const diffs: string[] = []

    // Text
    if (norm(ba.text) !== norm(sa.text_value)) {
      diffs.push(`text: "${ba.text}" → "${sa.text_value}"`)
    }

    // Text area / additional notes
    if (norm(ba['text-area']) !== norm(sa.additional_notes)) {
      diffs.push(`notes: "${ba['text-area']}" → "${sa.additional_notes}"`)
    }

    // Number
    if (normNum(ba.Number) !== normNum(sa.number_value)) {
      diffs.push(`num: ${ba.Number} → ${sa.number_value}`)
    }

    // Boolean
    if (normBool(ba.Boolean) !== normBool(sa.boolean_value)) {
      diffs.push(`bool: ${ba.Boolean} → ${sa.boolean_value}`)
    }

    // Choice — compare by content (only when we can resolve both sides)
    const bChoiceBubbleId: string | undefined = ba.Choice
    const bChoice = bChoiceBubbleId ? choicesByBubbleId.get(bChoiceBubbleId) : undefined
    const sChoiceContent = sa.choice_id ? supabaseChoiceMap.get(sa.choice_id) : undefined
    if (bChoiceBubbleId && !bChoice) {
      // Can't resolve Bubble choice — report separately, not as a mismatch
      diffs.push(`choice-unresolved: bubble_id="${bChoiceBubbleId}" supabase="${sChoiceContent || ''}"`)
    } else if ((bChoice?.content || '') !== (sChoiceContent || '')) {
      diffs.push(`choice: "${bChoice?.content || ''}" → "${sChoiceContent || sa.choice_id || ''}"`)
    }

    const realDiffs = diffs.filter(d => !d.startsWith('choice-unresolved'))
    const unresolvedDiffs = diffs.filter(d => d.startsWith('choice-unresolved'))

    if (realDiffs.length > 0) {
      mismatches.push(`${label}: ${realDiffs.join(' | ')}`)
      mismatched++
    } else {
      matched++
    }
    if (unresolvedDiffs.length > 0) {
      choiceWarnings.push(`${label}: supabase="${unresolvedDiffs.map(d => d.split('supabase="')[1]?.replace('"', '') || '').join(', ')}"`)
      choiceUnresolved++
    }
  }

  // Extra in Supabase (answers with no corresponding Bubble answer)
  const bubbleQIdsMapped = new Set<string>()
  for (const ba of bubbleNonList) {
    const qBubbleId = ba['Originating Question'] || ba['Parent Question']
    const q = qBubbleId ? questionsByBubbleId.get(qBubbleId) : null
    if (q) bubbleQIdsMapped.add(q.id)
  }
  const extraInSupabase = supabaseAnswers.filter(a => a.question_id && !bubbleQIdsMapped.has(a.question_id))

  // ── Report ─────────────────────────────────────────────────────────────

  console.log('─'.repeat(60))
  console.log('RESULTS  (non-list-table answers)')
  console.log('─'.repeat(60))
  console.log(`  Bubble answers checked       : ${bubbleNonList.length}`)
  console.log(`  ✅ Matched                   : ${matched}`)
  console.log(`  ⚠️  Mismatched               : ${mismatched}`)
  console.log(`  🔍 Choice lookup missing     : ${choiceUnresolved}`)
  console.log(`  ❌ Missing in Supabase       : ${missingInSupabase}`)
  console.log(`  ➕ Extra in Supabase         : ${extraInSupabase.length}`)
  if (noQuestionMapping > 0) {
    console.log(`  ❓ No question mapping       : ${noQuestionMapping}`)
  }

  if (mismatches.length > 0) {
    console.log('\n── Mismatches ──')
    mismatches.slice(0, 50).forEach(m => console.log('  ' + m))
    if (mismatches.length > 50) console.log(`  … and ${mismatches.length - 50} more`)
  }

  if (choiceWarnings.length > 0) {
    console.log('\n── Choice lookup missing (Bubble choice_id not in Supabase choices) ──')
    console.log('  (These could be valid matches — choice bubble_ids were not mapped)')
    choiceWarnings.slice(0, 30).forEach(m => console.log('  ' + m))
    if (choiceWarnings.length > 30) console.log(`  … and ${choiceWarnings.length - 30} more`)
  }

  if (missing.length > 0) {
    console.log('\n── Missing in Supabase (had values in Bubble) ──')
    missing.slice(0, 30).forEach(m => console.log('  ' + m))
    if (missing.length > 30) console.log(`  … and ${missing.length - 30} more`)
  }

  if (extraInSupabase.length > 0 && extraInSupabase.length <= 10) {
    console.log('\n── Extra in Supabase ──')
    for (const a of extraInSupabase) {
      const q = questionById.get(a.question_id)
      console.log(`  ${questionLabel(q)}: text="${a.text_value}" bool=${a.boolean_value} num=${a.number_value}`)
    }
  }

  console.log()
}

main().catch(err => {
  console.error('Fatal:', err)
  process.exit(1)
})
