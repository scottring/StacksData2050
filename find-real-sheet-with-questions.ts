import { supabase } from './src/migration/supabase-client.js'
import fetch from 'node-fetch'
import dotenv from 'dotenv'

dotenv.config()

const BUBBLE_BASE_URL = process.env.BUBBLE_API_URL!
const BUBBLE_API_TOKEN = process.env.BUBBLE_API_TOKEN!

async function findRealSheet() {
  console.log('=== Finding Real Sheet with Questions in BOTH Bubble and Supabase ===\n')

  // Get sheets from Supabase that have questions
  const { data: sheets } = await supabase
    .from('sheets')
    .select('id, name, bubble_id')
    .not('bubble_id', 'is', null)
    .limit(50)

  if (!sheets) {
    console.log('No sheets found')
    return
  }

  for (const sheet of sheets) {
    // Check Supabase question count
    const { count: supabaseCount } = await supabase
      .from('questions')
      .select('id', { count: 'exact', head: true })
      .eq('parent_sheet_id', sheet.id)

    if (!supabaseCount || supabaseCount < 20) continue

    // Check Bubble question count
    const bubbleUrl = `${BUBBLE_BASE_URL}/api/1.1/obj/question?constraints=[{"key":"Sheet","constraint_type":"equals","value":"${sheet.bubble_id}"}]&limit=1`
    const response = await fetch(bubbleUrl, {
      headers: { 'Authorization': `Bearer ${BUBBLE_API_TOKEN}` }
    })
    const data = await response.json() as any

    const bubbleCount = data.response?.count || 0

    if (bubbleCount > 20) {
      console.log(`✓ Found sheet: ${sheet.name}`)
      console.log(`  Supabase ID: ${sheet.id}`)
      console.log(`  Bubble ID: ${sheet.bubble_id}`)
      console.log(`  Supabase questions: ${supabaseCount}`)
      console.log(`  Bubble questions: ${bubbleCount}`)
      return
    }
  }

  console.log('No suitable sheet found')
}

findRealSheet()
