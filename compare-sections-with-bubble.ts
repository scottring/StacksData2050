import { supabase } from './src/migration/supabase-client.js'
import fetch from 'node-fetch'
import dotenv from 'dotenv'

dotenv.config()

const BUBBLE_BASE_URL = process.env.BUBBLE_API_URL!
const BUBBLE_API_TOKEN = process.env.BUBBLE_API_TOKEN!

async function compareSections() {
  console.log('🔍 Comparing Sections: Bubble vs Supabase\n')

  // Get all sections from Bubble
  const bubbleResp = await fetch(`${BUBBLE_BASE_URL}/api/1.1/obj/section`, {
    headers: { 'Authorization': `Bearer ${BUBBLE_API_TOKEN}` }
  })
  const bubbleData = await bubbleResp.json() as any
  const bubbleSections = bubbleData.response.results

  console.log(`Bubble has ${bubbleSections.length} sections`)
  console.log('Bubble sections:')
  bubbleSections.forEach((s: any) => {
    console.log(`  - ${s._id}: "${s.Name}" (stack: ${s.Stack?._id || 'none'})`)
  })
  console.log()

  // Get all sections from Supabase
  const { data: supabaseSections, error: supabaseError } = await supabase
    .from('sections')
    .select('*')

  if (supabaseError) {
    console.log(`ERROR querying Supabase sections: ${supabaseError.message}`)
    return
  }

  console.log(`Supabase has ${supabaseSections?.length} sections`)
  console.log('Supabase sections:')
  supabaseSections?.forEach(s => {
    console.log(`  - ${s.bubble_id}: "${s.name}"`)
  })
  console.log()

  // Find what's in Bubble but not in Supabase
  const bubbleIds = new Set(bubbleSections.map((s: any) => s._id))
  const supabaseIds = new Set(supabaseSections?.map(s => s.bubble_id) || [])

  const missingInSupabase = bubbleSections.filter((s: any) => !supabaseIds.has(s._id))
  const missingInBubble = supabaseSections?.filter(s => !bubbleIds.has(s.bubble_id)) || []

  console.log('=' .repeat(80))
  console.log('MISSING SECTIONS')
  console.log('=' .repeat(80))
  console.log()

  console.log(`❌ In Bubble but NOT in Supabase (${missingInSupabase.length}):`)
  missingInSupabase.forEach((s: any) => {
    console.log(`  - ${s._id}: "${s.Name}"`)
    console.log(`    Stack: ${s.Stack?._id || 'none'}`)
    console.log(`    Created: ${s['Created Date']}`)
  })
  console.log()

  console.log(`⚠️  In Supabase but NOT in Bubble (${missingInBubble.length}):`)
  missingInBubble.forEach(s => {
    console.log(`  - ${s.bubble_id}: "${s.name}"`)
  })
  console.log()

  // Check if missing sections have questions
  if (missingInSupabase.length > 0) {
    console.log('Checking if missing sections have questions in Bubble...')
    for (const section of missingInSupabase.slice(0, 5)) {
      const questionsResp = await fetch(
        `${BUBBLE_BASE_URL}/api/1.1/obj/question?constraints=[{"key":"SECTION","constraint_type":"equals","value":"${section._id}"}]`,
        { headers: { 'Authorization': `Bearer ${BUBBLE_API_TOKEN}` } }
      )
      const questionsData = await questionsResp.json() as any
      const questionCount = questionsData.response?.count || 0
      console.log(`  - ${section.Name}: ${questionCount} questions`)
    }
  }
}

compareSections().catch(console.error)
