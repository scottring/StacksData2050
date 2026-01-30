import fetch from 'node-fetch'
import dotenv from 'dotenv'
import { supabase } from './src/migration/supabase-client.js'

dotenv.config()

const BUBBLE_BASE_URL = process.env.BUBBLE_API_URL
const BUBBLE_API_TOKEN = process.env.BUBBLE_API_TOKEN

async function checkPIDSL() {
  console.log('Checking PIDSL Section Structure\n')
  
  // Get PIDSL section
  const { data: pidslSection } = await supabase
    .from('sections')
    .select('*')
    .eq('name', 'PIDSL')
    .single()
  
  if (!pidslSection) {
    console.log('PIDSL section not found')
    return
  }
  
  console.log('Section: ' + pidslSection.name)
  console.log('Order: ' + pidslSection.order_number)
  console.log('Bubble ID: ' + pidslSection.bubble_id + '\n')
  
  // Get subsections
  const { data: subsections } = await supabase
    .from('subsections')
    .select('*')
    .eq('section_id', pidslSection.id)
    .order('order_number')
  
  console.log('Subsections: ' + (subsections?.length || 0) + '\n')
  
  for (const sub of subsections || []) {
    console.log('  ' + sub.order_number + '. ' + sub.name)
    console.log('    Bubble ID: ' + sub.bubble_id)
    
    // Get questions for this subsection
    const { data: questions } = await supabase
      .from('questions')
      .select('id, bubble_id, order_number, section_sort_number, subsection_sort_number')
      .eq('parent_subsection_id', sub.id)
      .order('order_number')
    
    console.log('    Questions: ' + (questions?.length || 0))
    
    if (questions && questions.length > 0) {
      // Check first question in Bubble
      const firstQ = questions[0]
      const url = BUBBLE_BASE_URL + '/api/1.1/obj/question/' + firstQ.bubble_id
      const response = await fetch(url, {
        headers: { 'Authorization': 'Bearer ' + BUBBLE_API_TOKEN }
      })
      const data = await response.json()
      const bubbleQ = data.response
      
      console.log('    First question:')
      console.log('      Supabase order_number: ' + firstQ.order_number)
      console.log('      Bubble Order: ' + bubbleQ?.Order)
      console.log('      Supabase section_sort_number: ' + firstQ.section_sort_number)
      console.log('      Bubble SECTION SORT NUMBER: ' + bubbleQ?.['SECTION SORT NUMBER'])
      
      // Check if there's something unusual in the question structure
      console.log('      Bubble Question Type: ' + bubbleQ?.['Question Type'])
      console.log('      Bubble Parent Subsection: ' + bubbleQ?.['Parent Subsection'])
      console.log('      Bubble Parent Section: ' + bubbleQ?.['Parent Section'])
    }
    console.log()
  }
}

checkPIDSL()
