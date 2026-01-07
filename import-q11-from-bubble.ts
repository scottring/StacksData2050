import { supabase } from './src/migration/supabase-client.js'

const biocidesSection = 'f990287b-6a17-43e2-b78e-bed24b977cc7'

console.log('=== IMPORTING Q11 ANSWERS FROM BUBBLE ===\n')

// Get Q11 details
const { data: q11 } = await supabase
  .from('questions')
  .select('id, bubble_id, name')
  .eq('parent_section_id', biocidesSection)
  .eq('order_number', 11)
  .single()

console.log('Q11:', q11?.name?.substring(0, 60))
console.log('Q11 Bubble ID:', q11?.bubble_id)
console.log('Q11 Supabase ID:', q11?.id)

// Get Q11's choices
const { data: choices } = await supabase
  .from('choices')
  .select('id, content, bubble_id')
  .eq('parent_question_id', q11?.id)

console.log(`\nQ11 Choices:`)
const choiceMap = new Map<string, string>() // bubble_id -> supabase_id
choices?.forEach(c => {
  console.log(`  ${c.content} - Bubble: ${c.bubble_id}, Supabase: ${c.id}`)
  if (c.bubble_id) {
    choiceMap.set(c.bubble_id, c.id)
  }
})

// Get all sheets that are missing Q11 answer
const { data: allSheets } = await supabase
  .from('sheets')
  .select('id, bubble_id, name')
  .order('name')

const sheetsWithQ11Answer = new Set()
const { data: existingAnswers } = await supabase
  .from('answers')
  .select('sheet_id')
  .eq('parent_question_id', q11?.id)

existingAnswers?.forEach(a => sheetsWithQ11Answer.add(a.sheet_id))

const sheetsMissing = allSheets?.filter(s => !sheetsWithQ11Answer.has(s.id)) || []

console.log(`\nSheets missing Q11 answer: ${sheetsMissing.length}`)

// Now we need to fetch from Bubble API
// Get Bubble API credentials from environment
const BUBBLE_API_KEY = process.env.BUBBLE_API_KEY
const BUBBLE_API_URL = 'https://app.stacksdata.com/version-live/api/1.1'

if (!BUBBLE_API_KEY) {
  console.log('\n❌ BUBBLE_API_KEY not found in environment')
  console.log('Cannot fetch answers from Bubble API')
  console.log('\nAlternative approach: Check if answers exist with deleted question IDs')
  process.exit(1)
}

console.log('\n=== FETCHING FROM BUBBLE API ===')
console.log('This will take a while for 999 sheets...\n')

// Fetch in batches to avoid timeout
let imported = 0
let notFound = 0
let errors = 0

for (let i = 0; i < Math.min(sheetsMissing.length, 10); i++) {
  const sheet = sheetsMissing[i]

  if (!sheet.bubble_id) {
    console.log(`Sheet "${sheet.name}" has no bubble_id, skipping`)
    continue
  }

  try {
    // Fetch answers for this sheet from Bubble
    const url = `${BUBBLE_API_URL}/obj/answer?constraints=[{"key":"parent_sheet","constraint_type":"equals","value":"${sheet.bubble_id}"},{"key":"parent_question","constraint_type":"equals","value":"${q11?.bubble_id}"}]`

    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${BUBBLE_API_KEY}`
      }
    })

    const data = await response.json()

    if (data.response && data.response.results && data.response.results.length > 0) {
      const bubbleAnswer = data.response.results[0]

      // Map bubble choice_id to supabase choice_id
      const supabaseChoiceId = choiceMap.get(bubbleAnswer.choice?._id)

      if (supabaseChoiceId) {
        // Create answer in Supabase
        const { error } = await supabase
          .from('answers')
          .insert({
            sheet_id: sheet.id,
            parent_question_id: q11?.id,
            choice_id: supabaseChoiceId,
            bubble_id: bubbleAnswer._id,
            created_at: bubbleAnswer.Created_Date || new Date().toISOString(),
            modified_at: bubbleAnswer.Modified_Date || new Date().toISOString()
          })

        if (error) {
          console.log(`  ❌ Error creating answer: ${error.message}`)
          errors++
        } else {
          console.log(`  ✓ Imported answer for "${sheet.name}"`)
          imported++
        }
      } else {
        console.log(`  ⚠️  No matching choice for "${sheet.name}"`)
        notFound++
      }
    } else {
      notFound++
    }
  } catch (err) {
    console.log(`  ❌ Error fetching for "${sheet.name}": ${err}`)
    errors++
  }

  // Rate limit
  await new Promise(resolve => setTimeout(resolve, 100))
}

console.log(`\n=== SAMPLE RUN COMPLETE ===`)
console.log(`Imported: ${imported}`)
console.log(`Not found in Bubble: ${notFound}`)
console.log(`Errors: ${errors}`)
console.log(`\nTo import all ${sheetsMissing.length} sheets, remove the Math.min() limit in the loop`)
