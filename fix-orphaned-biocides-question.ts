import fetch from 'node-fetch'
import dotenv from 'dotenv'
import { supabase } from './src/migration/supabase-client.js'
import { getSupabaseId } from './src/migration/id-mapper.js'

dotenv.config()

const BUBBLE_BASE_URL = process.env.BUBBLE_API_URL
const BUBBLE_API_TOKEN = process.env.BUBBLE_API_TOKEN

async function fixOrphaned() {
  const bubbleId = '1621986483500x603202081932705800'
  const supabaseId = '6fe10d3a-1fc8-4141-abe9-4f3a3cf3b7d4'
  
  console.log('Fixing orphaned question...\n')
  
  // Get from Bubble
  const url = BUBBLE_BASE_URL + '/api/1.1/obj/question/' + bubbleId
  const response = await fetch(url, {
    headers: { 'Authorization': 'Bearer ' + BUBBLE_API_TOKEN }
  })
  const data = await response.json()
  const bubbleQ = data.response
  
  console.log('Bubble data:')
  console.log('  Question text: ' + bubbleQ['Question text'])
  console.log('  Order: ' + bubbleQ.Order)
  console.log('  SECTION SORT NUMBER: ' + bubbleQ['SECTION SORT NUMBER'])
  console.log('  Parent Subsection: ' + bubbleQ['Parent Subsection'])
  
  // Get subsection ID
  const subsectionId = await getSupabaseId(bubbleQ['Parent Subsection'], 'subsection')
  
  console.log('\nSupabase subsection ID: ' + subsectionId)
  
  // Update question
  const { error } = await supabase
    .from('questions')
    .update({
      content: bubbleQ['Question text'],
      order_number: bubbleQ.Order,
      section_sort_number: bubbleQ['SECTION SORT NUMBER'],
      parent_subsection_id: subsectionId,
      subsection_sort_number: 1 // Biocides is subsection 1 of section 3
    })
    .eq('id', supabaseId)
  
  if (error) {
    console.log('Error: ' + error.message)
    return
  }
  
  console.log('\n✓ Question fixed!')
}

fixOrphaned()
