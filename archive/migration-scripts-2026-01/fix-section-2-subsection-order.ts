import { supabase } from './src/migration/supabase-client.js'
import fetch from 'node-fetch'
import dotenv from 'dotenv'

dotenv.config()

const BUBBLE_BASE_URL = process.env.BUBBLE_API_URL!
const BUBBLE_API_TOKEN = process.env.BUBBLE_API_TOKEN!

async function fixSection2SubsectionOrder() {
  console.log('=== Fixing Section 2 Subsection Order ===\n')

  // Get Section 2
  const { data: section2 } = await supabase
    .from('sections')
    .select('id')
    .eq('order_number', 2)
    .single()

  // Get subsections
  const { data: subsections } = await supabase
    .from('subsections')
    .select('id, name, bubble_id, order_number')
    .eq('section_id', section2.id)
    .neq('order_number', 999)

  if (!subsections) return

  console.log('Current Supabase order:')
  const sorted = subsections.sort((a, b) => a.order_number - b.order_number)
  for (const sub of sorted) {
    console.log(`  2.${sub.order_number}: ${sub.name}`)
  }

  console.log('\nFetching Order from Bubble...\n')

  for (const sub of subsections) {
    const url = `${BUBBLE_BASE_URL}/api/1.1/obj/subsection/${sub.bubble_id}`
    const response = await fetch(url, {
      headers: { 'Authorization': `Bearer ${BUBBLE_API_TOKEN}` }
    })
    const data = await response.json() as any

    if (data.response && data.response.Order !== undefined && data.response.Order !== null) {
      const bubbleOrder = data.response.Order
      console.log(`${sub.name}: Bubble Order = ${bubbleOrder}`)

      if (sub.order_number !== bubbleOrder) {
        // Update subsection
        await supabase
          .from('subsections')
          .update({ order_number: bubbleOrder })
          .eq('id', sub.id)

        // Update questions
        await supabase
          .from('questions')
          .update({ subsection_sort_number: bubbleOrder })
          .eq('parent_subsection_id', sub.id)

        console.log(`  ✓ Updated: ${sub.order_number} → ${bubbleOrder}`)
      }
    }
  }

  // Show final order
  const { data: finalSubsections } = await supabase
    .from('subsections')
    .select('id, name, order_number')
    .eq('section_id', section2.id)
    .neq('order_number', 999)
    .order('order_number')

  console.log('\nFinal Supabase order:')
  for (const sub of finalSubsections!) {
    console.log(`  2.${sub.order_number}: ${sub.name}`)
  }
}

fixSection2SubsectionOrder()
