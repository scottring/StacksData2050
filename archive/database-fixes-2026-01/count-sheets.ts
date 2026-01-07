import { supabase } from './src/migration/supabase-client.js'

const { count: totalSheets } = await supabase
  .from('sheets')
  .select('id', { count: 'exact', head: true })

const { count: sheetsWithQ11 } = await supabase
  .from('answers')
  .select('sheet_id', { count: 'exact', head: true })
  .eq('parent_question_id', '53bdfe23-7266-4372-99cc-c3789c4f36c6') // Q11 ID

console.log('Total sheets in database:', totalSheets)
console.log('Sheets with Q11 answer:', sheetsWithQ11)
console.log('Sheets missing Q11:', (totalSheets || 0) - (sheetsWithQ11 || 0))
