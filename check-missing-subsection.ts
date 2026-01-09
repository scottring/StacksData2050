import { supabase } from './src/migration/supabase-client.js'
import fetch from 'node-fetch'
import dotenv from 'dotenv'

dotenv.config()

const BUBBLE_BASE_URL = process.env.BUBBLE_API_URL!
const BUBBLE_API_TOKEN = process.env.BUBBLE_API_TOKEN!

async function checkMissingSubsection() {
  const subsectionBubbleId = '1626200588208x767490048310378500'

  console.log('=== Checking Missing Subsection 4.8 ===\n')
  console.log('Checking if subsection exists in Supabase...\n')

  const { data: existing } = await supabase
    .from('subsections')
    .select('*')
    .eq('bubble_id', subsectionBubbleId)

  if (existing && existing.length > 0) {
    console.log('✓ Found in Supabase:')
    console.log(JSON.stringify(existing[0], null, 2))
  } else {
    console.log('❌ NOT FOUND in Supabase\n')
  }

  console.log('Fetching from Bubble...\n')

  const url = `${BUBBLE_BASE_URL}/api/1.1/obj/subsection/${subsectionBubbleId}`
  const response = await fetch(url, {
    headers: { 'Authorization': `Bearer ${BUBBLE_API_TOKEN}` }
  })
  const data = await response.json() as any

  if (data.response) {
    console.log('Subsection in Bubble:')
    console.log(`  Name: ${data.response.Name}`)
    console.log(`  Order: ${data.response.Order}`)
    console.log(`  Parent Section: ${data.response['Parent Section']}`)
    console.log(`  ID: ${data.response._id}`)
  } else {
    console.log('Not found in Bubble either')
  }
}

checkMissingSubsection()
