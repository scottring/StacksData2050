import { supabase } from './src/migration/supabase-client.js'
import fetch from 'node-fetch'
import dotenv from 'dotenv'

dotenv.config()

const BUBBLE_BASE_URL = process.env.BUBBLE_API_URL!
const BUBBLE_API_TOKEN = process.env.BUBBLE_API_TOKEN!

async function checkHiddenSubsections() {
  console.log('=== Checking Hidden/Invisible Subsections ===\n')

  // Get Section 1 subsections
  const { data: section1 } = await supabase
    .from('sections')
    .select('id')
    .eq('order_number', 1)
    .single()

  const { data: subsections } = await supabase
    .from('subsections')
    .select('id, name, order_number, bubble_id')
    .eq('section_id', section1.id)
    .order('order_number')

  if (!subsections) return

  for (const sub of subsections) {
    console.log(`\n1.${sub.order_number}: ${sub.name}`)
    console.log(`  Bubble ID: ${sub.bubble_id}`)

    // Count questions
    const { count } = await supabase
      .from('questions')
      .select('id', { count: 'exact', head: true })
      .eq('parent_subsection_id', sub.id)

    console.log(`  Questions in Supabase: ${count}`)

    // Check in Bubble
    if (sub.bubble_id) {
      const url = `${BUBBLE_BASE_URL}/api/1.1/obj/subsection/${sub.bubble_id}`
      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${BUBBLE_API_TOKEN}` }
      })
      const data = await response.json() as any

      if (data.response) {
        const bubbleSub = data.response
        console.log(`  Bubble fields:`)
        console.log(`    Order: ${bubbleSub.Order}`)
        console.log(`    Hidden: ${bubbleSub.Hidden}`)
        console.log(`    Invisible: ${bubbleSub.Invisible}`)
        console.log(`    Active: ${bubbleSub.Active}`)
      }
    }
  }

  console.log('\n\n=== Analysis ===')
  console.log('If subsections 1.1 and 1.2 are hidden/invisible in Bubble,')
  console.log('then Bubble displays "Product" as 1.2 by skipping them.')
  console.log('We need to either:')
  console.log('  1. Mark them as hidden in Supabase and filter them out')
  console.log('  2. Recalculate order numbers excluding hidden subsections')
}

checkHiddenSubsections()
