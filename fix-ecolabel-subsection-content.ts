import { supabase } from './src/migration/supabase-client.js'

// The subsection "EU Ecolabel" should have content text
const subsectionId = '0686e11d-d17b-4374-8d8a-80287320bcf3'
const correctContent = 'Does the product meet the restrictions for hazardous substances for the following EU ecolabel criteria?'

console.log('=== FIXING EU ECOLABEL SUBSECTION ===')

// Update the content field
const { error } = await supabase
  .from('subsections')
  .update({ content: correctContent })
  .eq('id', subsectionId)

if (error) {
  console.error('Error:', error)
} else {
  console.log('✅ Updated subsection content')
}

// Verify
const { data: subsection } = await supabase
  .from('subsections')
  .select('*')
  .eq('id', subsectionId)
  .single()

console.log('\nVerification:')
console.log(`Name: ${subsection?.name}`)
console.log(`Content: ${subsection?.content}`)
