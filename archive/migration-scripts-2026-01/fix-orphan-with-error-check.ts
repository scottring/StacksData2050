import fetch from 'node-fetch'
import dotenv from 'dotenv'
import { supabase } from './src/migration/supabase-client.js'

dotenv.config()

const BUBBLE_BASE_URL = process.env.BUBBLE_API_URL
const BUBBLE_API_TOKEN = process.env.BUBBLE_API_TOKEN

async function fix() {
  const questionId = '6fe10d3a-1fc8-4141-abe9-4f3a3cf3b7d4'
  const subsectionId = '4f777663-616a-4fda-9e10-718c92d8470e'
  
  // Get question from Supabase first
  const { data: currentQ } = await supabase
    .from('questions')
    .select('*')
    .eq('id', questionId)
    .single()
  
  console.log('Current state:')
  console.log('  bubble_id: ' + currentQ?.bubble_id)
  console.log('  parent_subsection_id: ' + currentQ?.parent_subsection_id)
  
  if (!currentQ?.bubble_id) {
    console.log('\nQuestion has no bubble_id! Cannot fetch from Bubble.')
    return
  }
  
  // Get from Bubble
  const url = BUBBLE_BASE_URL + '/api/1.1/obj/question/' + currentQ.bubble_id
  const response = await fetch(url, {
    headers: { 'Authorization': 'Bearer ' + BUBBLE_API_TOKEN }
  })
  const data = await response.json()
  const bubbleQ = data.response
  
  if (!bubbleQ) {
    console.log('Question not found in Bubble')
    return
  }
  
  console.log('\nBubble data:')
  console.log('  Order: ' + bubbleQ.Order)
  console.log('  SECTION SORT NUMBER: ' + bubbleQ['SECTION SORT NUMBER'])
  console.log('  Parent Subsection: ' + bubbleQ['Parent Subsection'])
  console.log('  Question text: ' + (bubbleQ['Question text'] || ''))
  
  // Update
  const { error } = await supabase
    .from('questions')
    .update({
      content: bubbleQ['Question text'],
      order_number: bubbleQ.Order,
      section_sort_number: bubbleQ['SECTION SORT NUMBER'],
      subsection_sort_number: 1,
      parent_subsection_id: subsectionId
    })
    .eq('id', questionId)
  
  if (error) {
    console.log('\n✗ Update failed: ' + error.message)
    console.log('Error details:', error)
  } else {
    console.log('\n✓ Update succeeded')
    
    // Verify
    const { data: updated } = await supabase
      .from('questions')
      .select('order_number, parent_subsection_id')
      .eq('id', questionId)
      .single()
    
    console.log('\nVerification:')
    console.log('  order_number: ' + updated?.order_number)
    console.log('  parent_subsection_id: ' + updated?.parent_subsection_id)
  }
}

fix()
