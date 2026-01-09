import { supabase } from './src/migration/supabase-client.js'

async function find() {
  const missingBubbleId = '1621986483500x603202081932705800'
  
  console.log('Searching for question with Bubble ID: ' + missingBubbleId + '\n')
  
  // Search in all questions
  const { data: found } = await supabase
    .from('questions')
    .select('*')
    .eq('bubble_id', missingBubbleId)
  
  if (found && found.length > 0) {
    console.log('Found ' + found.length + ' question(s):\n')
    found.forEach(q => {
      console.log('  ID: ' + q.id)
      console.log('  parent_subsection_id: ' + q.parent_subsection_id)
      console.log('  order_number: ' + q.order_number)
      console.log('  content: ' + (q.content || '').substring(0, 60))
      console.log()
    })
  } else {
    console.log('Not found in Supabase. This question was never migrated.')
    console.log('\nWe need to migrate it from Bubble.')
  }
}

find()
