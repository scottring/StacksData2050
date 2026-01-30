import fetch from 'node-fetch'
import dotenv from 'dotenv'
import { supabase } from './src/migration/supabase-client.js'

dotenv.config()

const BUBBLE_BASE_URL = process.env.BUBBLE_API_URL
const BUBBLE_API_TOKEN = process.env.BUBBLE_API_TOKEN

async function verify() {
  console.log('FINAL VERIFICATION - HYDROCARB 90-ME 78%')
  console.log('='.repeat(70) + '\n')
  
  // Check sections 1-4 only
  const sectionsToCheck = ['Product Information', 'Ecolabels', 'Biocides', 'Food Contact']
  
  for (const sectionName of sectionsToCheck) {
    const { data: section } = await supabase
      .from('sections')
      .select('*')
      .eq('name', sectionName)
      .single()
    
    if (!section) continue
    
    console.log('\n' + '='.repeat(70))
    console.log('SECTION ' + section.order_number + ': ' + section.name)
    console.log('='.repeat(70))
    
    // Get subsections
    const { data: subsections } = await supabase
      .from('subsections')
      .select('*')
      .eq('section_id', section.id)
      .neq('order_number', 999)
      .order('order_number')
    
    let sectionMatches = true
    
    for (const sub of subsections || []) {
      // Get Supabase questions
      const { data: supabaseQs } = await supabase
        .from('questions')
        .select('bubble_id, order_number')
        .eq('parent_subsection_id', sub.id)
        .order('order_number')
      
      // Get Bubble questions
      if (!sub.bubble_id) {
        console.log('\n  ⚠️  ' + section.order_number + '.' + sub.order_number + ' ' + sub.name)
        console.log('      No bubble_id - cannot verify')
        continue
      }
      
      const url = BUBBLE_BASE_URL + '/api/1.1/obj/question?constraints=[{"key":"Parent Subsection","constraint_type":"equals","value":"' + sub.bubble_id + '"}]'
      const response = await fetch(url, {
        headers: { 'Authorization': 'Bearer ' + BUBBLE_API_TOKEN }
      })
      const data = await response.json()
      const bubbleQs = data.response?.results || []
      
      const supabaseCount = supabaseQs?.length || 0
      const bubbleCount = bubbleQs.length
      const match = supabaseCount === bubbleCount
      
      const icon = match ? '✓' : '✗'
      console.log('\n  ' + icon + ' ' + section.order_number + '.' + sub.order_number + ' ' + sub.name)
      console.log('      Supabase: ' + supabaseCount + ' questions | Bubble: ' + bubbleCount + ' questions')
      
      if (!match) {
        sectionMatches = false
        
        // Show which are missing
        const supabaseBubbleIds = new Set(supabaseQs?.map(q => q.bubble_id))
        const bubbleBubbleIds = new Set(bubbleQs.map(q => q._id))
        
        const missingInSupabase = bubbleQs.filter(bq => !supabaseBubbleIds.has(bq._id))
        const extraInSupabase = supabaseQs?.filter(sq => sq.bubble_id && !bubbleBubbleIds.has(sq.bubble_id))
        
        if (missingInSupabase.length > 0) {
          console.log('      Missing in Supabase: ' + missingInSupabase.length + ' questions')
        }
        if (extraInSupabase && extraInSupabase.length > 0) {
          console.log('      Extra in Supabase: ' + extraInSupabase.length + ' questions')
        }
      }
    }
    
    if (sectionMatches) {
      console.log('\n  ✅ Section ' + section.order_number + ' matches perfectly!')
    }
  }
  
  console.log('\n' + '='.repeat(70))
  console.log('VERIFICATION COMPLETE')
  console.log('='.repeat(70))
}

verify()
