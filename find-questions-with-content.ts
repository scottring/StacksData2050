import { supabase } from './src/migration/supabase-client.js'

async function findQuestions() {
  // Get questions with content
  const { data: withContent, error } = await supabase
    .from('questions')
    .select('*')
    .not('content', 'is', null)
    .limit(3)
  
  console.log('Questions WITH content:', withContent?.length || 0)
  if (withContent && withContent.length > 0) {
    console.log('\nSample:', JSON.stringify(withContent[0], null, 2))
  }
  
  // Check total
  const { count } = await supabase
    .from('questions')
    .select('*', { count: 'exact', head: true })
  
  console.log(`\nTotal questions in database: ${count}`)
  
  // Check HQ2.1 questions
  const { data: hq21Tag } = await supabase
    .from('tags')
    .select('id')
    .eq('name', 'HQ2.1')
    .single()
  
  if (hq21Tag) {
    const { data: hq21Questions } = await supabase
      .from('questions')
      .select('id, content, name, static_text, question_type, section_sort_number, subsection_sort_number, order_number')
      .in('id', 
        (await supabase
          .from('question_tags')
          .select('question_id')
          .eq('tag_id', hq21Tag.id)
          .limit(5)
        ).data?.map(qt => qt.question_id) || []
      )
    
    console.log('\nSample HQ2.1 questions:')
    hq21Questions?.forEach(q => {
      console.log(`\n${q.section_sort_number}.${q.subsection_sort_number}.${q.order_number} - ${q.question_type}`)
      console.log(`  name: ${q.name}`)
      console.log(`  content: ${q.content}`)
      console.log(`  static_text: ${q.static_text}`)
    })
  }
}

findQuestions().then(() => process.exit(0)).catch(err => {
  console.error(err)
  process.exit(1)
})
