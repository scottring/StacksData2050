import { supabase } from './src/migration/supabase-client.js'
import fetch from 'node-fetch'
import dotenv from 'dotenv'

dotenv.config()

const BUBBLE_BASE_URL = process.env.BUBBLE_API_URL!
const BUBBLE_API_TOKEN = process.env.BUBBLE_API_TOKEN!

async function compareOneQuestion() {
  console.log('=== Compare One Question: Bubble vs Supabase ===\n')

  // Get a question from Section 4
  const { data: questions } = await supabase
    .from('questions')
    .select('*')
    .eq('section_sort_number', 4)
    .not('subsection_sort_number', 'is', null)
    .limit(10)

  if (!questions || questions.length === 0) {
    console.log('No questions in section 4')
    return
  }

  for (const q of questions) {
    console.log(`Supabase: ${q.section_sort_number}.${q.subsection_sort_number}.${q.order_number}: ${q.name?.substring(0, 50)}`)
    console.log(`  Bubble ID: ${q.bubble_id}`)

    // Fetch from Bubble
    const url = `${BUBBLE_BASE_URL}/api/1.1/obj/question/${q.bubble_id}`
    const response = await fetch(url, {
      headers: { 'Authorization': `Bearer ${BUBBLE_API_TOKEN}` }
    })
    const data = await response.json() as any

    if (data.response) {
      const bubbleNum = `${data.response['SECTION SORT NUMBER']}.${data.response['SUBSECTION SORT NUMBER']}.${data.response.Order}`
      console.log(`Bubble:    ${bubbleNum}: ${data.response.Name?.substring(0, 50)}`)

      const supabaseNum = `${q.section_sort_number}.${q.subsection_sort_number}.${q.order_number}`
      if (bubbleNum !== supabaseNum) {
        console.log(`❌ MISMATCH`)
      } else {
        console.log(`✓ Match`)
      }
    }
    console.log()
  }
}

compareOneQuestion()
