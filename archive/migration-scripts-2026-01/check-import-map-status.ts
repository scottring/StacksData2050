import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
dotenv.config()

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function checkImportMap() {
  // Check how many choices have import_map populated
  const { count: total } = await supabase
    .from('choices')
    .select('*', { count: 'exact', head: true })

  const { count: withImportMap } = await supabase
    .from('choices')
    .select('*', { count: 'exact', head: true })
    .not('import_map', 'is', null)

  const { count: withBubbleId } = await supabase
    .from('choices')
    .select('*', { count: 'exact', head: true })
    .not('bubble_id', 'is', null)

  console.log('=== CHOICES TABLE STATUS ===')
  console.log('Total choices:', total)
  console.log('With import_map populated:', withImportMap)
  console.log('With bubble_id (migrated from Bubble):', withBubbleId)

  // Get sample of choices with import_map
  const { data: samplesWithMap } = await supabase
    .from('choices')
    .select('content, import_map')
    .not('import_map', 'is', null)
    .limit(5)

  console.log('\nSample choices WITH import_map:')
  samplesWithMap?.forEach(c => console.log(`  "${c.content}" => import_map: "${c.import_map}"`))

  // Get sample of choices without import_map
  const { data: samplesWithout } = await supabase
    .from('choices')
    .select('content, import_map, bubble_id')
    .is('import_map', null)
    .limit(5)

  console.log('\nSample choices WITHOUT import_map:')
  samplesWithout?.forEach(c => console.log(`  "${c.content?.substring(0, 40)}" | bubble_id: ${c.bubble_id}`))

  // Check if Bubble had Import Map data - query the Bubble API
  console.log('\n=== CHECKING BUBBLE FOR IMPORT MAP DATA ===')

  const BUBBLE_API_URL = process.env.BUBBLE_API_URL
  const BUBBLE_API_TOKEN = process.env.BUBBLE_API_TOKEN

  if (BUBBLE_API_URL && BUBBLE_API_TOKEN) {
    try {
      const response = await fetch(`${BUBBLE_API_URL}/api/1.1/obj/choice?limit=5`, {
        headers: { 'Authorization': `Bearer ${BUBBLE_API_TOKEN}` }
      })
      const data = await response.json() as any

      console.log('Sample Bubble choices:')
      data.response?.results?.forEach((c: any) => {
        console.log(`  Content: "${c.Content?.substring(0, 40)}"`)
        console.log(`    Import Map: ${c['Import Map'] || 'NULL'}`)
        console.log()
      })
    } catch (err: any) {
      console.log('Could not fetch from Bubble:', err.message)
    }
  } else {
    console.log('Bubble API not configured')
  }
}

checkImportMap().catch(console.error)
