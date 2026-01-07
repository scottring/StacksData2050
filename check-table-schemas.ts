import { supabase } from './src/migration/supabase-client.js'

async function checkTableSchemas() {
  // Get a sample subsection to see the schema
  const { data: subsection } = await supabase
    .from('subsections')
    .select('*')
    .limit(1)
    .single()

  console.log('=== Sample Subsection Schema ===')
  console.log(JSON.stringify(subsection, null, 2))

  // Get a sample question to see the schema
  const { data: question } = await supabase
    .from('questions')
    .select('*')
    .limit(1)
    .single()

  console.log('\n=== Sample Question Schema ===')
  console.log(JSON.stringify(question, null, 2))
}

checkTableSchemas()
