import { supabase } from './src/migration/supabase-client.js'
import fetch from 'node-fetch'
import dotenv from 'dotenv'

dotenv.config()

const BUBBLE_BASE_URL = process.env.BUBBLE_API_URL!
const BUBBLE_API_TOKEN = process.env.BUBBLE_API_TOKEN!

async function fixSubsectionOrderNumbers() {
  console.log('=== Fixing Subsection Order Numbers ===\n')

  // Get all subsections with null order_number
  const { data: subsections } = await supabase
    .from('subsections')
    .select('id, bubble_id, name, order_number')

  if (!subsections || subsections.length === 0) {
    console.log('No subsections found')
    return
  }

  const nullOrder = subsections.filter(s => s.order_number === null)
  console.log(`Total subsections: ${subsections.length}`)
  console.log(`Subsections with null order_number: ${nullOrder.length}\n`)

  if (nullOrder.length === 0) {
    console.log('All subsections have order numbers')
    return
  }

  let fixed = 0
  let errors = 0
  let notFound = 0

  for (const subsection of nullOrder) {
    try {
      // Fetch from Bubble
      const url = `${BUBBLE_BASE_URL}/api/1.1/obj/subsection/${subsection.bubble_id}`
      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${BUBBLE_API_TOKEN}` }
      })
      const bubbleSubsection = await response.json() as any

      if (!bubbleSubsection.response) {
        console.log(`❌ Subsection ${subsection.bubble_id} not found in Bubble`)
        notFound++
        continue
      }

      const orderNumber = bubbleSubsection.response.Order

      if (orderNumber === undefined || orderNumber === null) {
        console.log(`  Subsection has no Order in Bubble: ${subsection.name}`)
        notFound++
        continue
      }

      // Update in Supabase
      const { error } = await supabase
        .from('subsections')
        .update({ order_number: orderNumber })
        .eq('id', subsection.id)

      if (error) {
        console.log(`❌ Failed to update subsection ${subsection.id}: ${error.message}`)
        errors++
      } else {
        fixed++
        if (fixed % 10 === 0) {
          console.log(`Progress: ${fixed} subsections fixed...`)
        }
      }
    } catch (err) {
      console.log(`❌ Error processing subsection ${subsection.id}: ${err}`)
      errors++
    }
  }

  console.log(`\n=== Complete ===`)
  console.log(`Fixed: ${fixed}`)
  console.log(`Not found: ${notFound}`)
  console.log(`Errors: ${errors}`)
}

fixSubsectionOrderNumbers()
