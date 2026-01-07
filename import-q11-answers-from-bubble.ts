import { supabase } from './src/migration/supabase-client.js'

const BUBBLE_API_URL = 'https://app.stacksdata.com/version-live/api/1.1'
const BUBBLE_API_TOKEN = '25c9fbc54eb17e72b4d0e344e1a4a2fe'

const biocidesSection = 'f990287b-6a17-43e2-b78e-bed24b977cc7'

console.log('=== IMPORTING Q11 ANSWERS FROM BUBBLE ===\n')

// Get Q11
const { data: q11 } = await supabase
  .from('questions')
  .select('id, bubble_id, name')
  .eq('parent_section_id', biocidesSection)
  .eq('order_number', 11)
  .single()

console.log('Q11:', q11?.name?.substring(0, 60))
console.log('Q11 Bubble ID:', q11?.bubble_id)

// Get Q11 choices with bubble_ids
const { data: choices } = await supabase
  .from('choices')
  .select('id, content, bubble_id')
  .eq('parent_question_id', q11?.id)

console.log('\nQ11 Choices:')
const choiceMap = new Map<string, string>()
choices?.forEach(c => {
  console.log(`  ${c.content} - Bubble: ${c.bubble_id}`)
  if (c.bubble_id) {
    choiceMap.set(c.bubble_id, c.id)
  }
})

// Get all sheets without Q11 answer
const { data: sheetsWithAnswer } = await supabase
  .from('answers')
  .select('sheet_id')
  .eq('parent_question_id', q11?.id)

const sheetIdsWithAnswer = new Set(sheetsWithAnswer?.map(a => a.sheet_id))

const { data: allSheets } = await supabase
  .from('sheets')
  .select('id, bubble_id, name')
  .order('name')

const sheetsMissing = allSheets?.filter(s => !sheetIdsWithAnswer.has(s.id) && s.bubble_id) || []

console.log(`\nSheets missing Q11 answer: ${sheetsMissing.length}`)
console.log('Starting import...\n')

let imported = 0
let notFound = 0
let errors = 0
let skipped = 0

for (const sheet of sheetsMissing) {
  try {
    // Fetch answers for this sheet from Bubble
    const url = `${BUBBLE_API_URL}/obj/answer?constraints=[{"key":"parent_sheet","constraint_type":"equals","value":"${sheet.bubble_id}"},{"key":"parent_question","constraint_type":"equals","value":"${q11?.bubble_id}"}]`

    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${BUBBLE_API_TOKEN}`
      }
    })

    if (!response.ok) {
      errors++
      if (errors <= 5) {
        console.log(`  ❌ HTTP ${response.status} for "${sheet.name}"`)
      }
      continue
    }

    const data = await response.json()

    if (data.response && data.response.results && data.response.results.length > 0) {
      const bubbleAnswer = data.response.results[0]

      // Map bubble choice_id to supabase choice_id
      const supabaseChoiceId = bubbleAnswer.choice ? choiceMap.get(bubbleAnswer.choice) : null

      if (supabaseChoiceId) {
        // Create answer in Supabase
        const { error } = await supabase
          .from('answers')
          .insert({
            sheet_id: sheet.id,
            parent_question_id: q11?.id,
            choice_id: supabaseChoiceId,
            bubble_id: bubbleAnswer._id,
            created_at: bubbleAnswer.Created || new Date().toISOString(),
            modified_at: bubbleAnswer.Modified || new Date().toISOString()
          })

        if (error) {
          if (errors <= 5) {
            console.log(`  ❌ DB Error for "${sheet.name}": ${error.message}`)
          }
          errors++
        } else {
          imported++
          if (imported <= 10 || imported % 100 === 0) {
            console.log(`  ✓ [${imported}] Imported for "${sheet.name}"`)
          }
        }
      } else {
        skipped++
        if (skipped <= 5) {
          console.log(`  ⚠️  No matching choice for "${sheet.name}"`)
        }
      }
    } else {
      notFound++
    }

    // Rate limit
    if (imported % 10 === 0) {
      await new Promise(resolve => setTimeout(resolve, 100))
    }
  } catch (err) {
    errors++
    if (errors <= 5) {
      console.log(`  ❌ Error for "${sheet.name}": ${err}`)
    }
  }
}

console.log(`\n=== IMPORT COMPLETE ===`)
console.log(`Imported: ${imported}`)
console.log(`Not found in Bubble: ${notFound}`)
console.log(`Skipped (no matching choice): ${skipped}`)
console.log(`Errors: ${errors}`)
console.log(`\nTotal Q11 answers now: ${imported + 1}`) // +1 for the one we created manually
