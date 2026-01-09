import { supabase } from './src/migration/supabase-client.js'
import fetch from 'node-fetch'
import dotenv from 'dotenv'

dotenv.config()

const BUBBLE_BASE_URL = process.env.BUBBLE_API_URL!
const BUBBLE_API_TOKEN = process.env.BUBBLE_API_TOKEN!
const BATCH_SIZE = 100

async function fixRemainingSheets() {
  console.log('=== Fixing Remaining Sheets (1001-1649) ===\n')

  // Get sheets after first 1000
  const { data: sheets } = await supabase
    .from('sheets')
    .select('id, name, version, bubble_id')
    .not('bubble_id', 'is', null)
    .order('name, version')
    .range(1000, 1648) // Skip first 1000, get remaining 649

  if (!sheets || sheets.length === 0) {
    console.log('No sheets found')
    return
  }

  console.log(`Found ${sheets.length} sheets to process\n`)

  let stats = {
    processed: 0,
    answersFixed: 0,
    answersCorrect: 0,
    errors: 0
  }

  for (const sheet of sheets) {
    console.log(`[${stats.processed + 1}/${sheets.length}] ${sheet.name} (v${sheet.version})`)

    try {
      // Get answers from Bubble
      const url = `${BUBBLE_BASE_URL}/api/1.1/obj/answer?constraints=[{"key":"Sheet","constraint_type":"equals","value":"${sheet.bubble_id}"}]`
      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${BUBBLE_API_TOKEN}` }
      })
      const data = await response.json() as any
      const bubbleAnswers = data.response?.results || []

      if (bubbleAnswers.length === 0) {
        stats.processed++
        continue
      }

      console.log(`  Found ${bubbleAnswers.length} answers in Bubble`)

      // Check Supabase
      const answerBubbleIds = bubbleAnswers.map((a: any) => a._id)
      const { data: supabaseAnswers } = await supabase
        .from('answers')
        .select('id, bubble_id, sheet_id')
        .in('bubble_id', answerBubbleIds)

      if (!supabaseAnswers || supabaseAnswers.length === 0) {
        console.log(`  ⚠️  No answers in Supabase`)
        stats.processed++
        continue
      }

      // Find wrong mappings
      const wrongMappings = supabaseAnswers.filter(a => a.sheet_id !== sheet.id)

      if (wrongMappings.length === 0) {
        console.log(`  ✓ All correct`)
        stats.answersCorrect += supabaseAnswers.length
      } else {
        console.log(`  ⚠️  ${wrongMappings.length} need fixing`)

        // Fix in batches
        for (let i = 0; i < wrongMappings.length; i += BATCH_SIZE) {
          const batch = wrongMappings.slice(i, i + BATCH_SIZE)
          const batchIds = batch.map(a => a.id)

          const { error } = await supabase
            .from('answers')
            .update({ sheet_id: sheet.id })
            .in('id', batchIds)

          if (error) {
            console.log(`    ❌ Error: ${error.message}`)
            stats.errors++
          } else {
            stats.answersFixed += batch.length
          }
        }
        console.log(`  ✓ Fixed ${wrongMappings.length} answers`)
        stats.answersCorrect += (supabaseAnswers.length - wrongMappings.length)
      }

      stats.processed++

      if (stats.processed % 20 === 0) {
        console.log(`\nProgress: ${stats.processed}/${sheets.length} sheets, ${stats.answersFixed} fixed, ${stats.errors} errors\n`)
      }

    } catch (error) {
      console.log(`  ❌ Error: ${error}`)
      stats.errors++
      stats.processed++
    }
  }

  console.log('\n=== Complete ===')
  console.log(`Sheets processed: ${stats.processed}`)
  console.log(`Answers fixed: ${stats.answersFixed}`)
  console.log(`Answers correct: ${stats.answersCorrect}`)
  console.log(`Errors: ${stats.errors}`)
}

fixRemainingSheets()
