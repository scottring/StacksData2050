import fetch from 'node-fetch'
import dotenv from 'dotenv'
import { supabase } from './src/migration/supabase-client.js'

dotenv.config()

const BUBBLE_BASE_URL = process.env.BUBBLE_API_URL
const BUBBLE_API_TOKEN = process.env.BUBBLE_API_TOKEN

async function checkSection4() {
  console.log('Checking Section 4 (Food Contact) subsections with missing questions\n')
  
  // Get Section 4
  const { data: section } = await supabase
    .from('sections')
    .select('id, name')
    .eq('name', 'Food Contact')
    .single()
  
  if (!section) return
  
  // Check France subsection (2 in Supabase vs 4 in Bubble)
  const { data: franceSub } = await supabase
    .from('subsections')
    .select('*')
    .eq('section_id', section.id)
    .eq('name', 'France')
    .single()
  
  if (franceSub) {
    console.log('France subsection:')
    console.log('  Bubble ID: ' + franceSub.bubble_id)
    
    const { data: supabaseQs } = await supabase
      .from('questions')
      .select('bubble_id')
      .eq('parent_subsection_id', franceSub.id)
    
    const url = BUBBLE_BASE_URL + '/api/1.1/obj/question?constraints=[{"key":"Parent Subsection","constraint_type":"equals","value":"' + franceSub.bubble_id + '"}]'
    const response = await fetch(url, {
      headers: { 'Authorization': 'Bearer ' + BUBBLE_API_TOKEN }
    })
    const data = await response.json()
    const bubbleQs = (data.response?.results || []).sort((a, b) => (a.Order || 0) - (b.Order || 0))
    
    console.log('  Supabase: ' + (supabaseQs?.length || 0) + ' questions')
    console.log('  Bubble: ' + bubbleQs.length + ' questions\n')
    
    const supabaseIds = new Set(supabaseQs?.map(q => q.bubble_id))
    bubbleQs.forEach(bq => {
      const exists = supabaseIds.has(bq._id)
      console.log((exists ? '  ✓' : '  ✗') + ' Order ' + bq.Order + ': ' + bq._id)
    })
  }
  
  console.log('\n')
  
  // Check EU Plastics subsection
  const { data: euSub } = await supabase
    .from('subsections')
    .select('*')
    .eq('section_id', section.id)
    .ilike('name', '%Plastics%Dual%')
    .single()
  
  if (euSub) {
    console.log('EU Plastics subsection:')
    console.log('  Name: ' + euSub.name)
    console.log('  Bubble ID: ' + euSub.bubble_id)
    
    const { data: supabaseQs } = await supabase
      .from('questions')
      .select('bubble_id')
      .eq('parent_subsection_id', euSub.id)
    
    const url = BUBBLE_BASE_URL + '/api/1.1/obj/question?constraints=[{"key":"Parent Subsection","constraint_type":"equals","value":"' + euSub.bubble_id + '"}]'
    const response = await fetch(url, {
      headers: { 'Authorization': 'Bearer ' + BUBBLE_API_TOKEN }
    })
    const data = await response.json()
    const bubbleQs = (data.response?.results || []).sort((a, b) => (a.Order || 0) - (b.Order || 0))
    
    console.log('  Supabase: ' + (supabaseQs?.length || 0) + ' questions')
    console.log('  Bubble: ' + bubbleQs.length + ' questions\n')
    
    const supabaseIds = new Set(supabaseQs?.map(q => q.bubble_id))
    bubbleQs.forEach(bq => {
      const exists = supabaseIds.has(bq._id)
      console.log((exists ? '  ✓' : '  ✗') + ' Order ' + bq.Order + ': ' + bq._id)
    })
  }
}

checkSection4()
