import { supabase } from './src/migration/supabase-client.js'

async function checkQuestion() {
  console.log('Looking for question 3.1.1.1...\n')

  // Find question 3.1.1.1 by name
  const { data: questions } = await supabase
    .from('questions')
    .select('*')
    .ilike('name', '%3.1.1.1%')

  console.log(`Found ${questions?.length || 0} questions with name like '3.1.1.1'`)

  if (questions && questions.length > 0) {
    questions.forEach((q, i) => {
      console.log(`  ${i + 1}. ${q.name}: ${q.content?.substring(0, 60)}...`)
    })
  }

  const question = questions?.[0]

  if (!question) {
    console.log('❌ Question not found')
    return
  }

  console.log('✅ Found question:', question.name)
  console.log('   Question type:', question.question_type)
  console.log('   List table ID:', question.list_table_id)

  if (question.list_table_id) {
    console.log('\n📋 Checking list table columns...')

    const { data: columns } = await supabase
      .from('list_table_columns')
      .select('*')
      .eq('parent_table_id', question.list_table_id)
      .order('order_number')

    console.log(`   Found ${columns?.length || 0} columns:`)
    columns?.forEach(col => {
      console.log(`   - ${col.name} (${col.response_type})`)
    })

    // Check if there are any rows
    const { data: rows } = await supabase
      .from('list_table_rows')
      .select('id')
      .eq('parent_table_id', question.list_table_id)
      .limit(5)

    console.log(`\n   Found ${rows?.length || 0} existing rows`)
  } else {
    console.log('⚠️  No list table associated with this question')
  }
}

checkQuestion()
