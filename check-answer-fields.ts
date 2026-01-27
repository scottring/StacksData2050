import { supabase } from './src/migration/supabase-client.js'

async function main() {
  const sheetId = '1038e05e-f492-4bf3-a101-bb7593142bb1'

  const { data: answers } = await supabase
    .from('answers')
    .select('*')
    .eq('sheet_id', sheetId)
    .limit(1)

  console.log('Sample answer fields:')
  console.log(JSON.stringify(answers?.[0], null, 2))
}

main().catch(console.error)
