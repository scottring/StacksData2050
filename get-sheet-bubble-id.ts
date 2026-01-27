import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function getSheetBubbleId() {
  const { data } = await supabase
    .from('sheets')
    .select('id, name, bubble_id')
    .eq('id', 'd594b54f-6170-4280-af1c-098ceb83a094')
    .single()

  console.log('Sheet:', data?.name)
  console.log('Bubble ID:', data?.bubble_id)
}

getSheetBubbleId().catch(console.error)
