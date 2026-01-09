import { supabase } from './src/migration/supabase-client.js'
import fetch from 'node-fetch'
import dotenv from 'dotenv'

dotenv.config()

const BUBBLE_BASE_URL = process.env.BUBBLE_API_URL!
const BUBBLE_API_TOKEN = process.env.BUBBLE_API_TOKEN!

async function fixSubsectionOrderFromBubble() {
  console.log('=== Fixing Subsection Order from Bubble ===\n')

  // Get all subsections
  const { data: subsections } = await supabase
    .from('subsections')
    .select('id, name, bubble_id, order_number, section_id')
    .not('bubble_id', 'is', null)

  if (!subsections) return

  console.log(`Processing ${subsections.length} subsections...\n`)

  let fixed = 0
  let errors = 0

  for (const sub of subsections) {
    // Fetch from Bubble
    const url = `${BUBBLE_BASE_URL}/api/1.1/obj/subsection/${sub.bubble_id}`
    const response = await fetch(url, {
      headers: { 'Authorization': `Bearer ${BUBBLE_API_TOKEN}` }
    })
    const data = await response.json() as any

    if (!data.response) {
      console.log(`❌ Subsection not found in Bubble: ${sub.bubble_id}`)
      errors++
      continue
    }

    const bubbleSub = data.response
    const bubbleOrder = bubbleSub.Order

    // If Bubble has an Order field, use it
    if (bubbleOrder !== undefined && bubbleOrder !== null) {
      if (sub.order_number !== bubbleOrder) {
        const { error } = await supabase
          .from('subsections')
          .update({ order_number: bubbleOrder })
          .eq('id', sub.id)

        if (error) {
          console.log(`❌ Error updating ${sub.name}: ${error.message}`)
          errors++
        } else {
          console.log(`✓ ${sub.name}: ${sub.order_number} → ${bubbleOrder}`)
          fixed++

          // Update all questions for this subsection
          await supabase
            .from('questions')
            .update({ subsection_sort_number: bubbleOrder })
            .eq('parent_subsection_id', sub.id)
        }
      }
    }
  }

  console.log(`\n=== Complete ===`)
  console.log(`Fixed: ${fixed}`)
  console.log(`Errors: ${errors}`)
}

fixSubsectionOrderFromBubble()
