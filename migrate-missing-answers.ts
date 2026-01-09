import { supabase } from './src/migration/supabase-client.js'
import fetch from 'node-fetch'
import dotenv from 'dotenv'

dotenv.config()

const BUBBLE_BASE_URL = process.env.BUBBLE_API_URL!
const BUBBLE_API_TOKEN = process.env.BUBBLE_API_TOKEN!
const DRY_RUN = process.env.DRY_RUN === 'true'
const BATCH_SIZE = 50

interface MigrationStats {
  sheetsProcessed: number
  answersFound: number
  answersInserted: number
  answersSkipped: number
  errors: number
  startTime: Date
}

async function migrateMissingAnswers(sheetLimit?: number) {
  const stats: MigrationStats = {
    sheetsProcessed: 0,
    answersFound: 0,
    answersInserted: 0,
    answersSkipped: 0,
    errors: 0,
    startTime: new Date()
  }

  console.log('=== Answer Migration for V2+ Sheets ===\n')
  console.log(`Mode: ${DRY_RUN ? 'DRY RUN (no actual inserts)' : 'LIVE MIGRATION'}`)
  console.log(`Batch size: ${BATCH_SIZE}`)
  console.log(`Sheet limit: ${sheetLimit || 'ALL'}`)
  console.log(`Started: ${stats.startTime.toISOString()}\n`)

  // Get V2+ sheets without answers
  console.log('Finding V2+ sheets with missing answers...\n')

  const { data: allV2PlusSheets } = await supabase
    .from('sheets')
    .select('id, name, version, bubble_id')
    .gt('version', 1)
    .not('bubble_id', 'is', null)
    .order('version, created_at')
    .limit(sheetLimit || 1000)

  if (!allV2PlusSheets || allV2PlusSheets.length === 0) {
    console.log('No V2+ sheets found')
    return
  }

  console.log(`Found ${allV2PlusSheets.length} V2+ sheets to check\n`)

  // Filter to only sheets without answers
  const sheetsToMigrate: typeof allV2PlusSheets = []

  for (const sheet of allV2PlusSheets) {
    const { count } = await supabase
      .from('answers')
      .select('id', { count: 'exact', head: true })
      .eq('sheet_id', sheet.id)

    if (!count || count === 0) {
      sheetsToMigrate.push(sheet)
    }
  }

  console.log(`${sheetsToMigrate.length} sheets have no answers and need migration\n`)
  console.log('='.repeat(80))

  // Migrate each sheet
  for (const sheet of sheetsToMigrate) {
    console.log(`\n[${stats.sheetsProcessed + 1}/${sheetsToMigrate.length}] ${sheet.name} (v${sheet.version})`)
    console.log(`  Sheet ID: ${sheet.id}`)
    console.log(`  Bubble ID: ${sheet.bubble_id}`)

    try {
      // Fetch answers from Bubble
      const bubbleAnswers = await fetchBubbleAnswers(sheet.bubble_id)

      if (bubbleAnswers.length === 0) {
        console.log(`  ⚠️  No answers in Bubble - skipping`)
        stats.sheetsProcessed++
        continue
      }

      console.log(`  Found ${bubbleAnswers.length} answers in Bubble`)
      stats.answersFound += bubbleAnswers.length

      // Check which answers already exist
      const existingBubbleIds = await getExistingBubbleIds(
        bubbleAnswers.map(a => a._id)
      )

      const newAnswers = bubbleAnswers.filter(a => !existingBubbleIds.has(a._id))

      if (newAnswers.length === 0) {
        console.log(`  ✓ All answers already exist in Supabase`)
        stats.answersSkipped += bubbleAnswers.length
        stats.sheetsProcessed++
        continue
      }

      console.log(`  ${newAnswers.length} new answers to insert`)

      if (DRY_RUN) {
        console.log(`  [DRY RUN] Would insert ${newAnswers.length} answers`)
        stats.answersInserted += newAnswers.length
      } else {
        // Insert in batches
        const inserted = await insertAnswersBatch(newAnswers, sheet.id)
        stats.answersInserted += inserted
        console.log(`  ✓ Inserted ${inserted} answers`)
      }

      stats.answersSkipped += (bubbleAnswers.length - newAnswers.length)
      stats.sheetsProcessed++

    } catch (error) {
      console.log(`  ❌ Error: ${error}`)
      stats.errors++
    }

    // Progress update every 10 sheets
    if (stats.sheetsProcessed % 10 === 0) {
      printProgress(stats)
    }
  }

  // Final report
  console.log('\n' + '='.repeat(80))
  console.log('\n=== Migration Complete ===\n')
  printProgress(stats)

  const duration = (Date.now() - stats.startTime.getTime()) / 1000
  console.log(`\nDuration: ${Math.round(duration)}s`)
  console.log(`Rate: ${Math.round(stats.answersInserted / duration)} answers/second`)
}

async function fetchBubbleAnswers(sheetBubbleId: string): Promise<any[]> {
  const url = `${BUBBLE_BASE_URL}/api/1.1/obj/answer?constraints=[{"key":"Sheet","constraint_type":"equals","value":"${sheetBubbleId}"}]`

  const response = await fetch(url, {
    headers: { 'Authorization': `Bearer ${BUBBLE_API_TOKEN}` }
  })

  const data = await response.json() as any

  if (!data.response?.results) {
    return []
  }

  return data.response.results
}

async function getExistingBubbleIds(bubbleIds: string[]): Promise<Set<string>> {
  if (bubbleIds.length === 0) return new Set()

  const { data } = await supabase
    .from('answers')
    .select('bubble_id')
    .in('bubble_id', bubbleIds)

  return new Set(data?.map(a => a.bubble_id) || [])
}

async function insertAnswersBatch(bubbleAnswers: any[], sheetId: string): Promise<number> {
  let inserted = 0

  // Get question and choice mappings
  const questionMap = await getQuestionMapping(bubbleAnswers)
  const choiceMap = await getChoiceMapping(bubbleAnswers)

  for (let i = 0; i < bubbleAnswers.length; i += BATCH_SIZE) {
    const batch = bubbleAnswers.slice(i, i + BATCH_SIZE)

    const answersToInsert = batch.map(a => ({
      bubble_id: a._id,
      sheet_id: sheetId,
      parent_question_id: questionMap.get(a['Parent Question']),
      choice_id: a.Choice ? choiceMap.get(a.Choice) : null,
      text_value: a.text || null,
      text_area_value: a['Text Area'] || null,
      boolean_value: a['Boolean Value'] ?? null,
      number_value: a['Number Value'] ?? null,
      date_value: a['Date Value'] || null,
      clarification: a.Clarification || null,
      created_at: a['Created Date'] || new Date().toISOString(),
      modified_at: a['Modified Date'] || new Date().toISOString(),
    })).filter(a => a.parent_question_id) // Only insert if question exists

    if (answersToInsert.length === 0) continue

    const { error } = await supabase
      .from('answers')
      .insert(answersToInsert)

    if (error) {
      console.log(`    ⚠️  Batch insert error: ${error.message}`)
      // Continue with next batch
    } else {
      inserted += answersToInsert.length
    }
  }

  return inserted
}

async function getQuestionMapping(bubbleAnswers: any[]): Promise<Map<string, string>> {
  const questionBubbleIds = [...new Set(bubbleAnswers.map(a => a['Parent Question']).filter(Boolean))]

  if (questionBubbleIds.length === 0) return new Map()

  const { data: questions } = await supabase
    .from('questions')
    .select('id, bubble_id')
    .in('bubble_id', questionBubbleIds)

  const map = new Map<string, string>()
  questions?.forEach(q => map.set(q.bubble_id, q.id))

  return map
}

async function getChoiceMapping(bubbleAnswers: any[]): Promise<Map<string, string>> {
  const choiceBubbleIds = [...new Set(bubbleAnswers.map(a => a.Choice).filter(Boolean))]

  if (choiceBubbleIds.length === 0) return new Map()

  const { data: choices } = await supabase
    .from('choices')
    .select('id, bubble_id')
    .in('bubble_id', choiceBubbleIds)

  const map = new Map<string, string>()
  choices?.forEach(c => map.set(c.bubble_id, c.id))

  return map
}

function printProgress(stats: MigrationStats) {
  console.log('\nProgress:')
  console.log(`  Sheets processed: ${stats.sheetsProcessed}`)
  console.log(`  Answers found in Bubble: ${stats.answersFound}`)
  console.log(`  Answers inserted: ${stats.answersInserted}`)
  console.log(`  Answers skipped (already exist): ${stats.answersSkipped}`)
  console.log(`  Errors: ${stats.errors}`)
}

// Get limit from command line args
const args = process.argv.slice(2)
const limitArg = args.find(a => a.startsWith('--limit='))
const limit = limitArg ? parseInt(limitArg.split('=')[1]) : undefined

migrateMissingAnswers(limit)
