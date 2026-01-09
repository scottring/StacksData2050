import fetch from 'node-fetch'
import dotenv from 'dotenv'
import { supabase } from './src/migration/supabase-client.js'
import { recordMapping, getSupabaseId } from './src/migration/id-mapper.js'

dotenv.config()

const BUBBLE_BASE_URL = process.env.BUBBLE_API_URL
const BUBBLE_API_TOKEN = process.env.BUBBLE_API_TOKEN

async function migrateMissing() {
  const missingBubbleId = '1621986483500x603202081932705800'
  
  console.log('Checking if question was ever migrated...\n')
  
  // Check if it exists
  const existingId = await getSupabaseId(missingBubbleId, 'question')
  
  if (existingId) {
    console.log('Question exists in Supabase: ' + existingId)
    console.log('Checking why it appears missing...\n')
    
    const { data: question } = await supabase
      .from('questions')
      .select('*')
      .eq('id', existingId)
      .single()
    
    console.log('Question details:')
    console.log('  parent_subsection_id: ' + question?.parent_subsection_id)
    console.log('  order_number: ' + question?.order_number)
    console.log('  content: ' + (question?.content || '').substring(0, 60))
    
    return
  }
  
  console.log('Question not in Supabase. Fetching from Bubble...\n')
  
  const url = BUBBLE_BASE_URL + '/api/1.1/obj/question/' + missingBubbleId
  const response = await fetch(url, {
    headers: { 'Authorization': 'Bearer ' + BUBBLE_API_TOKEN }
  })
  const data = await response.json()
  const bubbleQ = data.response
  
  if (!bubbleQ) {
    console.log('Question not found in Bubble either!')
    return
  }
  
  console.log('Found in Bubble:')
  console.log('  Question text: ' + (bubbleQ['Question text'] || ''))
  console.log('  Order: ' + bubbleQ.Order)
  console.log('  Parent Subsection: ' + bubbleQ['Parent Subsection'])
  
  // Get subsection ID
  const subsectionId = await getSupabaseId(bubbleQ['Parent Subsection'], 'subsection')
  
  if (!subsectionId) {
    console.log('Parent subsection not found in Supabase')
    return
  }
  
  console.log('\nMigrating question...')
  
  const { data: inserted, error } = await supabase
    .from('questions')
    .insert({
      bubble_id: bubbleQ._id,
      content: bubbleQ['Question text'],
      question_type: bubbleQ['Question Type'],
      order_number: bubbleQ.Order,
      section_sort_number: bubbleQ['SECTION SORT NUMBER'],
      parent_subsection_id: subsectionId,
      required: bubbleQ.Required || false,
      created_at: bubbleQ['Created Date'],
      modified_at: bubbleQ['Modified Date']
    })
    .select()
    .single()
  
  if (error) {
    console.log('Error: ' + error.message)
    return
  }
  
  console.log('✓ Question migrated: ' + inserted.id)
  
  // Record mapping
  await recordMapping(bubbleQ._id, inserted.id, 'question')
  
  console.log('✓ Mapping recorded')
}

migrateMissing()
