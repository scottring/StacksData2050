import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
dotenv.config()

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function check() {
  // First, let's see what fields questions actually have
  const { data: sample, error: sampleErr } = await supabase
    .from('questions')
    .select('*')
    .limit(2)

  if (sampleErr) {
    console.log('Error:', sampleErr)
    return
  }

  console.log('Sample question fields:', Object.keys(sample?.[0] || {}))
  console.log('\nFirst question:', JSON.stringify(sample?.[0], null, 2))

  // Now get a question by bubble_id
  const { data: byBubbleId, error: bbErr } = await supabase
    .from('questions')
    .select('*')
    .eq('bubble_id', '1619235797989x149918667769380860')
    .single()

  if (bbErr) {
    console.log('\nError finding by bubble_id:', bbErr)
  } else {
    console.log('\nQuestion by bubble_id:', JSON.stringify(byBubbleId, null, 2))
  }

  // Count questions with/without text content
  const { count: totalCount } = await supabase
    .from('questions')
    .select('*', { count: 'exact', head: true })

  const { count: withText } = await supabase
    .from('questions')
    .select('*', { count: 'exact', head: true })
    .not('text', 'is', null)
    .neq('text', '')

  console.log('\n--- Content Analysis ---')
  console.log('Total questions:', totalCount)
  console.log('Questions with text:', withText)
}

check()
