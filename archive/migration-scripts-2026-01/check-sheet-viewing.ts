import { supabase } from './src/migration/supabase-client.js'

async function main() {
  const sheetId = '1038e05e-f492-4bf3-a101-bb7593142bb1'

  const { data: sheet } = await supabase
    .from('sheets')
    .select('id, name, assigned_to_company_id, companies!sheets_assigned_to_company_id_fkey(name)')
    .eq('id', sheetId)
    .single()

  console.log('Sheet you are viewing:', sheet?.name)
  console.log('Company:', (sheet?.companies as any)?.name)
  console.log('Sheet ID:', sheetId)

  const { data: answers } = await supabase
    .from('answers')
    .select('id')
    .eq('sheet_id', sheetId)

  console.log('Answers for this sheet:', answers?.length || 0)

  // Now check the FennoCide sheet
  const { data: fennoSheet } = await supabase
    .from('sheets')
    .select('id, name')
    .eq('name', 'FennoCide BZ26 - P&P ViS HQ v2.1')
    .single()

  console.log('\nFennoCide sheet:')
  console.log('Name:', fennoSheet?.name)
  console.log('ID:', fennoSheet?.id)

  if (fennoSheet) {
    const { data: fennoAnswers } = await supabase
      .from('answers')
      .select('id')
      .eq('sheet_id', fennoSheet.id)

    console.log('Answers on FennoCide sheet:', fennoAnswers?.length || 0)
  }
}

main().catch(console.error)
