import { supabase } from './src/migration/supabase-client.js'

async function checkAllListTables() {
  console.log('=== Checking all list table questions ===\n')

  // Find all questions with question_type = 'List table'
  const { data: listTableQuestions } = await supabase
    .from('questions')
    .select('*')
    .eq('question_type', 'List table')
    .order('section_sort_number')
    .order('subsection_sort_number')
    .order('order_number')

  console.log(`Found ${listTableQuestions?.length || 0} list table questions:\n`)

  const issuesFound: any[] = []

  for (const q of listTableQuestions || []) {
    const questionNum = `${q.section_sort_number}.${q.subsection_sort_number}.${q.order_number}`
    const hasListTableId = !!q.list_table_id

    if (!hasListTableId) {
      issuesFound.push({
        questionNum,
        id: q.id,
        name: q.name || q.content?.substring(0, 50)
      })
      console.log(`❌ ${questionNum} ${q.name || 'NO NAME'}`)
      console.log(`   Missing list_table_id (ID: ${q.id})`)
    } else {
      console.log(`✅ ${questionNum} ${q.name || 'NO NAME'}`)

      // Verify columns exist
      const { data: columns } = await supabase
        .from('list_table_columns')
        .select('id')
        .eq('parent_table_id', q.list_table_id)

      if (!columns || columns.length === 0) {
        console.log(`   ⚠️  No columns found for list_table_id ${q.list_table_id}`)
        issuesFound.push({
          questionNum,
          id: q.id,
          name: q.name || q.content?.substring(0, 50),
          issue: 'no_columns'
        })
      } else {
        console.log(`   ${columns.length} columns`)
      }
    }
    console.log('')
  }

  if (issuesFound.length > 0) {
    console.log(`\n⚠️  Found ${issuesFound.length} questions with issues:`)
    issuesFound.forEach(issue => {
      console.log(`   ${issue.questionNum} - ${issue.name}`)
    })
  } else {
    console.log('\n✅ All list table questions have proper list_table_id!')
  }
}

checkAllListTables().catch(console.error)
