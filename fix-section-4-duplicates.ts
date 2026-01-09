import fetch from 'node-fetch'
import dotenv from 'dotenv'
import { supabase } from './src/migration/supabase-client.js'

dotenv.config()

const BUBBLE_BASE_URL = process.env.BUBBLE_API_URL
const BUBBLE_API_TOKEN = process.env.BUBBLE_API_TOKEN

async function fixDuplicates() {
  console.log('Fixing Section 4 duplicate subsections\n')
  
  // Get Section 4
  const { data: section } = await supabase
    .from('sections')
    .select('id')
    .eq('name', 'Food Contact')
    .single()
  
  if (!section) return
  
  // Get all subsections
  const { data: subsections } = await supabase
    .from('subsections')
    .select('*')
    .eq('section_id', section.id)
    .order('order_number')
  
  // Group by name to find duplicates
  const byName = new Map()
  subsections?.forEach(sub => {
    if (!byName.has(sub.name)) {
      byName.set(sub.name, [])
    }
    byName.get(sub.name).push(sub)
  })
  
  console.log('Duplicate subsections:\n')
  
  for (const [name, subs] of byName) {
    if (subs.length > 1) {
      console.log(name + ':')
      
      for (const sub of subs) {
        // Get question count
        const { count } = await supabase
          .from('questions')
          .select('id', { count: 'exact', head: true })
          .eq('parent_subsection_id', sub.id)
        
        console.log('  order ' + sub.order_number + ': ' + (count || 0) + ' questions, bubble_id: ' + sub.bubble_id)
      }
      
      // Strategy: Keep the one with order_number < 999 and questions
      const valid = subs.filter(s => s.order_number !== 999 && s.order_number !== null)
      const toDelete = subs.filter(s => s.order_number === 999)
      
      if (valid.length === 1 && toDelete.length > 0) {
        console.log('  → Keep order ' + valid[0].order_number + ', delete ' + toDelete.length + ' duplicates')
        
        for (const dup of toDelete) {
          // Move any questions to the valid subsection
          const { count } = await supabase
            .from('questions')
            .select('id', { count: 'exact', head: true })
            .eq('parent_subsection_id', dup.id)
          
          if (count && count > 0) {
            console.log('  → Moving ' + count + ' questions from duplicate to valid subsection')
            await supabase
              .from('questions')
              .update({ parent_subsection_id: valid[0].id })
              .eq('parent_subsection_id', dup.id)
          }
          
          // Delete the duplicate
          await supabase
            .from('subsections')
            .delete()
            .eq('id', dup.id)
        }
        
        console.log('  ✓ Cleaned up\n')
      } else if (valid.length > 1) {
        console.log('  ⚠️  Multiple valid subsections - need manual review')
        
        // Check which one matches Bubble
        for (const sub of valid) {
          if (!sub.bubble_id) continue
          
          const url = BUBBLE_BASE_URL + '/api/1.1/obj/subsection/' + sub.bubble_id
          const response = await fetch(url, {
            headers: { 'Authorization': 'Bearer ' + BUBBLE_API_TOKEN }
          })
          const data = await response.json()
          const bubbleOrder = data.response?.Order
          
          console.log('  → order ' + sub.order_number + ' has Bubble Order: ' + bubbleOrder)
        }
        console.log()
      } else {
        console.log('  → No clear action\n')
      }
    }
  }
}

fixDuplicates()
