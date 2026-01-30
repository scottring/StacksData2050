import fetch from 'node-fetch'
import dotenv from 'dotenv'
import { supabase } from './src/migration/supabase-client.js'

dotenv.config()

const BUBBLE_BASE_URL = process.env.BUBBLE_API_URL
const BUBBLE_API_TOKEN = process.env.BUBBLE_API_TOKEN

async function fixFrance() {
  console.log('Fixing France subsection questions\n')
  
  // Get both France subsections
  const { data: section } = await supabase
    .from('sections')
    .select('id')
    .eq('name', 'Food Contact')
    .single()
  
  if (!section) return
  
  const { data: franceSubs } = await supabase
    .from('subsections')
    .select('*')
    .eq('section_id', section.id)
    .eq('name', 'France')
    .order('order_number')
  
  for (const sub of franceSubs || []) {
    console.log('Subsection order ' + sub.order_number + ':')
    
    const { data: questions } = await supabase
      .from('questions')
      .select('id, bubble_id, order_number')
      .eq('parent_subsection_id', sub.id)
    
    if (!questions || questions.length === 0) continue
    
    console.log('  Questions: ' + questions.length)
    
    for (const q of questions) {
      if (!q.bubble_id) continue
      
      const url = BUBBLE_BASE_URL + '/api/1.1/obj/question/' + q.bubble_id
      const response = await fetch(url, {
        headers: { 'Authorization': 'Bearer ' + BUBBLE_API_TOKEN }
      })
      const data = await response.json()
      const bubbleQ = data.response
      
      if (!bubbleQ) continue
      
      const bubbleOrder = bubbleQ.Order
      const sectionSort = bubbleQ['SECTION SORT NUMBER']
      
      if (q.order_number !== bubbleOrder || !q.order_number) {
        console.log('  Fixing question ' + q.bubble_id)
        console.log('    Current order: ' + q.order_number + ' → Bubble order: ' + bubbleOrder)
        
        await supabase
          .from('questions')
          .update({
            order_number: bubbleOrder,
            section_sort_number: sectionSort || 4,
            subsection_sort_number: sub.order_number
          })
          .eq('id', q.id)
      }
    }
    
    console.log()
  }
}

fixFrance()
