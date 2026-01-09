import fetch from 'node-fetch'
import dotenv from 'dotenv'
import { supabase } from './src/migration/supabase-client.js'

dotenv.config()

const BUBBLE_BASE_URL = process.env.BUBBLE_API_URL
const BUBBLE_API_TOKEN = process.env.BUBBLE_API_TOKEN

async function fixSection3() {
  console.log('Checking Section 3 (Biocides) for missing question\n')
  
  // Get Section 3
  const { data: section } = await supabase
    .from('sections')
    .select('id, bubble_id, name')
    .eq('name', 'Biocides')
    .single()
  
  if (!section) {
    console.log('Section not found')
    return
  }
  
  // Get Biocides subsection
  const { data: subsection } = await supabase
    .from('subsections')
    .select('*')
    .eq('section_id', section.id)
    .eq('name', 'Biocides')
    .single()
  
  if (!subsection) {
    console.log('Subsection not found')
    return
  }
  
  console.log('Section: ' + section.name)
  console.log('Subsection: ' + subsection.name + ' (order: ' + subsection.order_number + ')\n')
  
  // Get questions from Supabase
  const { data: supabaseQuestions } = await supabase
    .from('questions')
    .select('bubble_id, order_number')
    .eq('parent_subsection_id', subsection.id)
    .order('order_number')
  
  console.log('Supabase questions: ' + (supabaseQuestions?.length || 0))
  
  // Get questions from Bubble
  const url = BUBBLE_BASE_URL + '/api/1.1/obj/question?constraints=[{"key":"Parent Subsection","constraint_type":"equals","value":"' + subsection.bubble_id + '"}]'
  const response = await fetch(url, {
    headers: { 'Authorization': 'Bearer ' + BUBBLE_API_TOKEN }
  })
  const data = await response.json()
  const bubbleQuestions = (data.response?.results || []).sort((a, b) => (a.Order || 0) - (b.Order || 0))
  
  console.log('Bubble questions: ' + bubbleQuestions.length + '\n')
  
  // Find which Bubble question is missing in Supabase
  const supabaseBubbleIds = new Set(supabaseQuestions?.map(q => q.bubble_id))
  
  console.log('Comparing questions:\n')
  for (let i = 0; i < bubbleQuestions.length; i++) {
    const bq = bubbleQuestions[i]
    const exists = supabaseBubbleIds.has(bq._id)
    const status = exists ? '✓' : '✗ MISSING'
    console.log(status + ' Order ' + bq.Order + ': ' + bq._id)
    if (!exists) {
      console.log('    Question text: ' + (bq['Question text'] || '').substring(0, 60))
    }
  }
}

fixSection3()
