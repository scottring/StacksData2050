import fetch from 'node-fetch'
import dotenv from 'dotenv'
import { supabase } from './src/migration/supabase-client.js'
import { recordMapping } from './src/migration/id-mapper.js'

dotenv.config()

const BUBBLE_BASE_URL = process.env.BUBBLE_API_URL
const BUBBLE_API_TOKEN = process.env.BUBBLE_API_TOKEN

async function migrate() {
  const bubbleId = '1621986483500x603202081932705800'
  
  console.log('Migrating Biocides question Order 4...\n')
  
  // Get from Bubble
  const url = BUBBLE_BASE_URL + '/api/1.1/obj/question/' + bubbleId
  const response = await fetch(url, {
    headers: { 'Authorization': 'Bearer ' + BUBBLE_API_TOKEN }
  })
  const data = await response.json()
  const bubbleQ = data.response
  
  if (!bubbleQ) {
    console.log('Question not found in Bubble')
    return
  }
  
  console.log('Bubble question:')
  console.log('  Order: ' + bubbleQ.Order)
  console.log('  SECTION SORT NUMBER: ' + bubbleQ['SECTION SORT NUMBER'])
  console.log('  Parent Subsection: ' + bubbleQ['Parent Subsection'])
  console.log('  Question text: ' + (bubbleQ['Question text'] || '(empty)'))
  
  // Get subsection ID from Bubble ID
  const { data: subsection } = await supabase
    .from('subsections')
    .select('id, name')
    .eq('bubble_id', bubbleQ['Parent Subsection'])
    .single()
  
  if (!subsection) {
    console.log('\nParent subsection not found in Supabase')
    return
  }
  
  console.log('\nParent subsection: ' + subsection.name)
  console.log('  ID: ' + subsection.id)
  
  // Insert
  const { data: inserted, error } = await supabase
    .from('questions')
    .insert({
      bubble_id: bubbleQ._id,
      content: bubbleQ['Question text'],
      question_type: bubbleQ['Question Type'],
      order_number: bubbleQ.Order,
      section_sort_number: bubbleQ['SECTION SORT NUMBER'],
      subsection_sort_number: 1, // Biocides subsection is 1
      parent_subsection_id: subsection.id,
      required: bubbleQ.Required || false,
      created_at: bubbleQ['Created Date'],
      modified_at: bubbleQ['Modified Date']
    })
    .select()
    .single()
  
  if (error) {
    console.log('\n✗ Migration failed: ' + error.message)
    return
  }
  
  console.log('\n✓ Question migrated successfully!')
  console.log('  Supabase ID: ' + inserted.id)
  
  // Record mapping
  await recordMapping(bubbleQ._id, inserted.id, 'question')
  console.log('✓ Mapping recorded')
  
  // Verify count
  const { count } = await supabase
    .from('questions')
    .select('id', { count: 'exact', head: true })
    .eq('parent_subsection_id', subsection.id)
  
  console.log('\n✓ Biocides subsection now has ' + count + ' questions')
}

migrate()
