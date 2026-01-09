import fetch from 'node-fetch'
import dotenv from 'dotenv'
import { supabase } from './src/migration/supabase-client.js'
import { getSupabaseId } from './src/migration/id-mapper.js'

dotenv.config()

const BUBBLE_BASE_URL = process.env.BUBBLE_API_URL
const BUBBLE_API_TOKEN = process.env.BUBBLE_API_TOKEN

async function compareAll() {
  console.log('Comprehensive Section/Subsection/Question Comparison')
  console.log('='.repeat(70) + '\n')
  
  // Get all sections from Supabase
  const { data: sections } = await supabase
    .from('sections')
    .select('*')
    .order('order_number')
  
  if (!sections) {
    console.log('No sections found')
    return
  }
  
  for (const section of sections) {
    if (!section.bubble_id || section.order_number === null) continue
    
    console.log('\n' + '='.repeat(70))
    console.log('SECTION ' + section.order_number + ': ' + section.name)
    console.log('='.repeat(70))
    
    // Get subsections for this section
    const { data: subsections } = await supabase
      .from('subsections')
      .select('*')
      .eq('section_id', section.id)
      .order('order_number')
    
    if (!subsections || subsections.length === 0) {
      console.log('  No subsections')
      continue
    }
    
    for (const subsection of subsections) {
      if (subsection.order_number === 999) continue // Skip hidden subsections
      
      console.log('\n  ' + section.order_number + '.' + subsection.order_number + ' ' + subsection.name)
      
      // Get questions for this subsection in Supabase
      const { data: supabaseQuestions } = await supabase
        .from('questions')
        .select('id, bubble_id, content, order_number, section_sort_number, subsection_sort_number')
        .eq('parent_subsection_id', subsection.id)
        .order('order_number')
      
      if (!supabaseQuestions || supabaseQuestions.length === 0) {
        console.log('    (no questions)')
        continue
      }
      
      // Get corresponding subsection from Bubble
      if (!subsection.bubble_id) continue
      
      const bubbleSubUrl = BUBBLE_BASE_URL + '/api/1.1/obj/subsection/' + subsection.bubble_id
      const bubbleSubResponse = await fetch(bubbleSubUrl, {
        headers: { 'Authorization': 'Bearer ' + BUBBLE_API_TOKEN }
      })
      const bubbleSubData = await bubbleSubResponse.json()
      const bubbleOrder = bubbleSubData.response?.Order
      
      // Get questions from Bubble for this subsection
      const bubbleQUrl = BUBBLE_BASE_URL + '/api/1.1/obj/question?constraints=[{"key":"Parent Subsection","constraint_type":"equals","value":"' + subsection.bubble_id + '"}]'
      const bubbleQResponse = await fetch(bubbleQUrl, {
        headers: { 'Authorization': 'Bearer ' + BUBBLE_API_TOKEN }
      })
      const bubbleQData = await bubbleQResponse.json()
      const bubbleQuestions = (bubbleQData.response?.results || [])
        .sort((a, b) => (a.Order || 0) - (b.Order || 0))
      
      console.log('    Supabase: ' + supabaseQuestions.length + ' questions')
      console.log('    Bubble: ' + bubbleQuestions.length + ' questions')
      
      if (supabaseQuestions.length !== bubbleQuestions.length) {
        console.log('    ⚠️  MISMATCH: Different question counts!')
      }
      
      // Compare question order
      const maxLen = Math.max(supabaseQuestions.length, bubbleQuestions.length)
      let orderMismatches = 0
      
      for (let i = 0; i < Math.min(5, maxLen); i++) {
        const sq = supabaseQuestions[i]
        const bq = bubbleQuestions[i]
        
        if (sq && bq) {
          const match = sq.bubble_id === bq._id
          const prefix = match ? '    ✓' : '    ✗'
          
          const sqNum = section.order_number + '.' + subsection.order_number + '.' + sq.order_number
          const bqNum = section.order_number + '.' + (bubbleOrder || subsection.order_number) + '.' + (bq.Order || '?')
          
          console.log(prefix + ' Q' + (i+1) + ': ' + sqNum + ' vs ' + bqNum)
          
          if (!match) {
            orderMismatches++
            console.log('        Supabase: ' + (sq.content || '').substring(0, 50))
            console.log('        Bubble: ' + (bq['Question text'] || '').substring(0, 50))
          }
        } else if (sq) {
          console.log('    ✗ Q' + (i+1) + ': Only in Supabase')
        } else if (bq) {
          console.log('    ✗ Q' + (i+1) + ': Only in Bubble')
        }
      }
      
      if (orderMismatches > 0) {
        console.log('    ⚠️  ' + orderMismatches + ' order mismatches in first 5 questions')
      }
    }
  }
  
  console.log('\n' + '='.repeat(70))
  console.log('Comparison complete')
  console.log('='.repeat(70))
}

compareAll()
