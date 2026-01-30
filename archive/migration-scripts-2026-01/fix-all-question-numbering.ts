import fetch from 'node-fetch'
import dotenv from 'dotenv'
import { supabase } from './src/migration/supabase-client.js'

dotenv.config()

const BUBBLE_BASE_URL = process.env.BUBBLE_API_URL
const BUBBLE_API_TOKEN = process.env.BUBBLE_API_TOKEN

async function fixAll() {
  console.log('Fixing ALL question numbering from Bubble...\n')
  
  // Get all questions from Supabase
  const { data: questions } = await supabase
    .from('questions')
    .select('id, bubble_id, order_number, section_sort_number, subsection_sort_number')
  
  if (!questions) {
    console.log('No questions found')
    return
  }
  
  console.log('Processing ' + questions.length + ' questions...\n')
  
  let fixed = 0
  let errors = 0
  
  for (const q of questions) {
    if (!q.bubble_id) continue
    
    try {
      // Get question from Bubble
      const url = BUBBLE_BASE_URL + '/api/1.1/obj/question/' + q.bubble_id
      const response = await fetch(url, {
        headers: { 'Authorization': 'Bearer ' + BUBBLE_API_TOKEN }
      })
      const data = await response.json()
      const bubbleQ = data.response
      
      if (!bubbleQ) {
        console.log('Question not found in Bubble: ' + q.bubble_id)
        errors++
        continue
      }
      
      const bubbleOrder = bubbleQ.Order
      const bubbleSectionSort = bubbleQ['SECTION SORT NUMBER']
      
      // Get subsection to determine subsection_sort_number
      let subsectionSort = q.subsection_sort_number
      if (bubbleQ['Parent Subsection']) {
        const { data: subsection } = await supabase
          .from('subsections')
          .select('order_number')
          .eq('bubble_id', bubbleQ['Parent Subsection'])
          .single()
        
        if (subsection && subsection.order_number !== null) {
          subsectionSort = subsection.order_number
        }
      }
      
      // Check if update needed
      const needsUpdate = 
        q.order_number !== bubbleOrder ||
        q.section_sort_number !== bubbleSectionSort ||
        q.subsection_sort_number !== subsectionSort
      
      if (needsUpdate) {
        await supabase
          .from('questions')
          .update({
            order_number: bubbleOrder,
            section_sort_number: bubbleSectionSort,
            subsection_sort_number: subsectionSort
          })
          .eq('id', q.id)
        
        fixed++
        if (fixed % 10 === 0) {
          console.log('Fixed ' + fixed + ' questions...')
        }
      }
      
    } catch (err) {
      console.log('Error processing question ' + q.id + ': ' + err)
      errors++
    }
  }
  
  console.log('\nComplete!')
  console.log('Fixed: ' + fixed)
  console.log('Errors: ' + errors)
}

fixAll()
