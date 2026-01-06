import { supabase } from './src/migration/supabase-client.js';

async function checkRemainingReferences() {
  const productInfoGenInfo = '8e717b21-42b9-4d73-838c-12f8e5843893'

  // Check answers
  const { data: answers, count: answerCount } = await supabase
    .from('answers')
    .select('id', { count: 'exact' })
    .eq('parent_subsection_id', productInfoGenInfo)

  console.log(`Answers still referencing old subsection: ${answerCount}`)

  // Check other tables that might reference subsections
  const tables = [
    'questions',
    'sheet_tags',
    'question_tags',
    'subsections', // Self-reference?
  ]

  for (const table of tables) {
    try {
      const { count } = await supabase
        .from(table)
        .select('id', { count: 'exact', head: true })
        .eq('parent_subsection_id', productInfoGenInfo)

      if (count && count > 0) {
        console.log(`${table}: ${count} references`)
      }
    } catch (e) {
      // Column might not exist in this table
    }
  }

  // Check if there's a limit on the query
  if (answerCount && answerCount > 1000) {
    console.log(`\n⚠️  There are ${answerCount} total answers, but we only updated 1000`)
    console.log('Need to update the remaining answers')
  }
}

checkRemainingReferences().catch(console.error)
