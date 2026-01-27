import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

async function main() {
  const sheetId = '1038e05e-f492-4bf3-a101-bb7593142bb1'
  
  // Get total count
  const { count, error } = await supabase
    .from('answers')
    .select('*', { count: 'exact', head: true })
    .eq('sheet_id', sheetId)

  console.log('Total answers for sheet:', count)
  
  // Get with nulls
  const { data: all } = await supabase
    .from('answers')
    .select('id, text_value, parent_question_id')
    .eq('sheet_id', sheetId)
  
  console.log('Fetched answers:', all?.length)
  
  const withValue = all?.filter(a => a.text_value) || []
  const withoutValue = all?.filter(a => !a.text_value) || []
  
  console.log('With text_value:', withValue.length)
  console.log('Without text_value (null):', withoutValue.length)
}

main()
