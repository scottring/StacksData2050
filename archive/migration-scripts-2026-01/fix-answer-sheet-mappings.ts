import { supabase } from './src/migration/supabase-client.js'
import fetch from 'node-fetch'
import dotenv from 'dotenv'

dotenv.config()

const BUBBLE_BASE_URL = process.env.BUBBLE_API_URL!
const BUBBLE_API_TOKEN = process.env.BUBBLE_API_TOKEN!
const DRY_RUN = process.env.DRY_RUN === 'true'
const BATCH_SIZE = 100

interface FixStats {
  sheetsProcessed: number
  answersChecked: number
  answersFixed: number
  answersCorrect: number
  errors: number
  startTime: Date
}

async function fixAnswerSheetMappings(sheetLimit?: number) {
  const stats: FixStats = {
    sheetsProcessed: 0,
    answersChecked: 0,
    answersFixed: 0,
    answersCorrect: 0,
    errors: 0,
    startTime: new Date()
  }

  console.log('=== Fixing Answer sheet_id Mappings ===\n')
  console.log(`Mode: ${DRY_RUN ? 'DRY RUN (no actual updates)' : 'LIVE FIX'}`)
  console.log(`Batch size: ${BATCH_SIZE}`)
  console.log(`Sheet limit: ${sheetLimit || 'ALL'}`)
  console.log(`Started: ${stats.startTime.toISOString()}\n`)

  // Get all sheets (we'll check their answers)
  console.log('Loading sheets...\n')

  const { data: sheets } = await supabase
    .from('sheets')
    .select('id, name, version, bubble_id')
    .not('bubble_id', 'is', null)
    .order('name, version')
    .limit(sheetLimit || 2000)

  if (!sheets || sheets.length === 0) {
    console.log('No sheets found')
    return
  }

  console.log(`Found ${sheets.length} sheets to check\n`)
  console.log('='.repeat(80))

  // Create a map of bubble_id -> sheet_id for fast lookup
  const bubbleToSheetMap = new Map<string, string>()
  sheets.forEach(s => bubbleToSheetMap.set(s.bubble_id, s.id))

  // Process each sheet
  for (const sheet of sheets) {
    console.log(`\n[${stats.sheetsProcessed + 1}/${sheets.length}] ${sheet.name} (v${sheet.version})`)

    try {
      // Get answers from Bubble for this sheet
      const bubbleAnswers = await fetchBubbleAnswers(sheet.bubble_id)

      if (bubbleAnswers.length === 0) {
        stats.sheetsProcessed++
        continue
      }

      console.log(`  Found ${bubbleAnswers.length} answers in Bubble`)

      // Check each answer's sheet_id in Supabase
      const answerBubbleIds = bubbleAnswers.map(a => a._id)
      const { data: supabaseAnswers } = await supabase
        .from('answers')
        .select('id, bubble_id, sheet_id')
        .in('bubble_id', answerBubbleIds)

      if (!supabaseAnswers || supabaseAnswers.length === 0) {
        console.log(`  ⚠️  No matching answers in Supabase - might need migration`)
        stats.sheetsProcessed++
        continue
      }

      console.log(`  Found ${supabaseAnswers.length} answers in Supabase`)
      stats.answersChecked += supabaseAnswers.length

      // Find answers with wrong sheet_id
      const wrongMappings = supabaseAnswers.filter(a => a.sheet_id !== sheet.id)

      if (wrongMappings.length === 0) {
        console.log(`  ✓ All answers have correct sheet_id`)
        stats.answersCorrect += supabaseAnswers.length
      } else {
        console.log(`  ⚠️  ${wrongMappings.length} answers have wrong sheet_id`)

        // Show where they're currently pointing
        const wrongSheetIds = [...new Set(wrongMappings.map(a => a.sheet_id))]
        for (const wrongId of wrongSheetIds.slice(0, 3)) {
          const { data: wrongSheet } = await supabase
            .from('sheets')
            .select('name, version')
            .eq('id', wrongId)
            .single()

          if (wrongSheet) {
            const count = wrongMappings.filter(a => a.sheet_id === wrongId).length
            console.log(`    ${count} answers point to: ${wrongSheet.name} (v${wrongSheet.version})`)
          }
        }

        if (DRY_RUN) {
          console.log(`  [DRY RUN] Would fix ${wrongMappings.length} answers`)
          stats.answersFixed += wrongMappings.length
        } else {
          // Fix in batches
          let fixed = 0
          for (let i = 0; i < wrongMappings.length; i += BATCH_SIZE) {
            const batch = wrongMappings.slice(i, i + BATCH_SIZE)
            const batchIds = batch.map(a => a.id)

            const { error } = await supabase
              .from('answers')
              .update({ sheet_id: sheet.id })
              .in('id', batchIds)

            if (error) {
              console.log(`    ❌ Batch update error: ${error.message}`)
              stats.errors++
            } else {
              fixed += batch.length
            }
          }
          console.log(`  ✓ Fixed ${fixed} answers`)
          stats.answersFixed += fixed
        }

        stats.answersCorrect += (supabaseAnswers.length - wrongMappings.length)
      }

      stats.sheetsProcessed++

      // Progress update every 20 sheets
      if (stats.sheetsProcessed % 20 === 0) {
        printProgress(stats)
      }

    } catch (error) {
      console.log(`  ❌ Error: ${error}`)
      stats.errors++
      stats.sheetsProcessed++
    }
  }

  // Final report
  console.log('\n' + '='.repeat(80))
  console.log('\n=== Fix Complete ===\n')
  printProgress(stats)

  const duration = (Date.now() - stats.startTime.getTime()) / 1000
  console.log(`\nDuration: ${Math.round(duration)}s`)
  if (stats.answersFixed > 0) {
    console.log(`Rate: ${Math.round(stats.answersFixed / duration)} answers/second`)
  }
}

async function fetchBubbleAnswers(sheetBubbleId: string): Promise<any[]> {
  const url = `${BUBBLE_BASE_URL}/api/1.1/obj/answer?constraints=[{"key":"Sheet","constraint_type":"equals","value":"${sheetBubbleId}"}]`

  try {
    const response = await fetch(url, {
      headers: { 'Authorization': `Bearer ${BUBBLE_API_TOKEN}` }
    })

    const data = await response.json() as any

    if (!data.response?.results) {
      return []
    }

    return data.response.results
  } catch (error) {
    return []
  }
}

function printProgress(stats: FixStats) {
  console.log('\nProgress:')
  console.log(`  Sheets processed: ${stats.sheetsProcessed}`)
  console.log(`  Answers checked: ${stats.answersChecked}`)
  console.log(`  Answers with correct mapping: ${stats.answersCorrect}`)
  console.log(`  Answers fixed: ${stats.answersFixed}`)
  console.log(`  Errors: ${stats.errors}`)
}

// Get limit from command line args
const args = process.argv.slice(2)
const limitArg = args.find(a => a.startsWith('--limit='))
const limit = limitArg ? parseInt(limitArg.split('=')[1]) : undefined

fixAnswerSheetMappings(limit)
