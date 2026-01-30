import { supabase } from './src/migration/supabase-client.js'
import fetch from 'node-fetch'
import dotenv from 'dotenv'

dotenv.config()

const BUBBLE_BASE_URL = process.env.BUBBLE_API_URL!
const BUBBLE_API_TOKEN = process.env.BUBBLE_API_TOKEN!

async function compareSection1Subsections() {
  console.log('=== Comparing Section 1 Subsections ===\n')

  // Get Section 1 from Supabase
  const { data: section1 } = await supabase
    .from('sections')
    .select('id, name, order_number, bubble_id')
    .eq('order_number', 1)
    .maybeSingle()

  if (!section1) {
    console.log('Section 1 not found')
    return
  }

  console.log(`Section 1: ${section1.name}`)
  console.log(`Bubble ID: ${section1.bubble_id}\n`)

  // Get subsections in Supabase for Section 1
  const { data: supabaseSubsections } = await supabase
    .from('subsections')
    .select('id, name, order_number, bubble_id, created_at')
    .eq('section_id', section1.id)
    .order('order_number')

  console.log('=== Supabase Subsections ===\n')
  if (supabaseSubsections) {
    for (const sub of supabaseSubsections) {
      console.log(`1.${sub.order_number}: ${sub.name}`)
      console.log(`  Bubble ID: ${sub.bubble_id}`)
      console.log(`  Created: ${sub.created_at}`)
      console.log()
    }
  }

  // Get subsections from Bubble for Section 1
  console.log('\n=== Bubble Subsections ===\n')

  const url = `${BUBBLE_BASE_URL}/api/1.1/obj/subsection?constraints=[{"key":"Parent Section","constraint_type":"equals","value":"${section1.bubble_id}"}]&sort_field=Created%20Date`
  const response = await fetch(url, {
    headers: { 'Authorization': `Bearer ${BUBBLE_API_TOKEN}` }
  })
  const data = await response.json() as any

  if (data.response && data.response.results) {
    const bubbleSubsections = data.response.results
    console.log(`Found ${bubbleSubsections.length} subsections in Bubble\n`)

    for (let i = 0; i < bubbleSubsections.length; i++) {
      const sub = bubbleSubsections[i]
      console.log(`1.${i + 1}: ${sub.Name}`)
      console.log(`  Bubble ID: ${sub._id}`)
      console.log(`  Order field: ${sub.Order}`)
      console.log(`  Created: ${sub['Created Date']}`)
      console.log()
    }
  }

  // Compare
  console.log('\n=== COMPARISON ===\n')
  console.log('The order_number in Supabase should match the position in Bubble (by creation date)')
}

compareSection1Subsections()
