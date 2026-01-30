import { supabase } from './src/migration/supabase-client.js'

async function main() {
  const sheetId = '1038e05e-f492-4bf3-a101-bb7593142bb1'

  const { data: answers } = await supabase
    .from('answers')
    .select('id, parent_question_id, choice_id, text_value, questions!answers_parent_question_id_fkey(name, question_type)')
    .eq('sheet_id', sheetId)
    .not('choice_id', 'is', null)

  console.log(`Total dropdown answers imported: ${answers?.length}\n`)
  console.log('Sample dropdown answers:\n')

  answers?.slice(0, 15).forEach((a, idx) => {
    const q = a.questions as any
    console.log(`${idx + 1}. ${q?.name?.substring(0, 70)}...`)
    console.log(`   Answer: "${a.text_value}"`)
    console.log()
  })
}

main().catch(console.error)
