import fetch from 'node-fetch'
import dotenv from 'dotenv'
import { supabase } from './src/migration/supabase-client.js'

dotenv.config()

const BUBBLE_BASE_URL = process.env.BUBBLE_API_URL
const BUBBLE_API_TOKEN = process.env.BUBBLE_API_TOKEN

async function fixSection2() {
  console.log('Fixing Section 2 (Ecolabels) question numbering\n')
  
  // Get Section 2
  const { data: section } = await supabase
    .from('sections')
    .select('id, name, order_number')
    .eq('name', 'Ecolabels')
    .single()
  
  if (!section) {
    console.log('Section 2 not found')
    return
  }
  
  console.log('Section: ' + section.name + ' (order: ' + section.order_number + ')\n')
  
  // Get all subsections
  const { data: subsections } = await supabase
    .from('subsections')
    .select('*')
    .eq('section_id', section.id)
    .neq('order_number', 999)
    .order('order_number')
  
  for (const subsection of subsections || []) {
    console.log('\n' + section.order_number + '.' + subsection.order_number + ' ' + subsection.name)
    
    // Get questions for this subsection
    const { data: questions } = await supabase
      .from('questions')
      .select('*')
      .eq('parent_subsection_id', subsection.id)
      .order('order_number')
    
    if (!questions || questions.length === 0) continue
    
    console.log('  Fixing ' + questions.length + ' questions...')
    
    let fixed = 0
    for (const q of questions) {
      if (!q.bubble_id) continue
      
      // Get question from Bubble
      const url = BUBBLE_BASE_URL + '/api/1.1/obj/question/' + q.bubble_id
      const response = await fetch(url, {
        headers: { 'Authorization': 'Bearer ' + BUBBLE_API_TOKEN }
      })
      const data = await response.json()
      const bubbleQ = data.response
      
      if (!bubbleQ) continue
      
      const updates = {
        order_number: bubbleQ.Order,
        section_sort_number: bubbleQ['SECTION SORT NUMBER'] || section.order_number,
        subsection_sort_number: subsection.order_number
      }
      
      // Only update if something changed
      if (q.order_number !== updates.order_number ||
          q.section_sort_number !== updates.section_sort_number ||
          q.subsection_sort_number !== updates.subsection_sort_number) {
        
        await supabase
          .from('questions')
          .update(updates)
          .eq('id', q.id)
        
        fixed++
      }
    }
    
    console.log('  Fixed: ' + fixed + ' questions')
  }
  
  console.log('\n\nVerifying...\n')
  
  // Re-check
  for (const subsection of subsections || []) {
    const { data: questions } = await supabase
      .from('questions')
      .select('bubble_id, order_number')
      .eq('parent_subsection_id', subsection.id)
      .order('order_number')
      .limit(3)
    
    console.log(section.order_number + '.' + subsection.order_number + ' ' + subsection.name + ':')
    questions?.forEach((q, i) => {
      console.log('  Q' + (i+1) + ': order_number = ' + q.order_number)
    })
  }
}

fixSection2()
