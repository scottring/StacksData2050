import { supabase } from './src/migration/supabase-client.js'

const BUBBLE_API_URL = 'https://app.stacksdata.com/version-live/api/1.1'
const BUBBLE_API_TOKEN = '25c9fbc54eb17e72b4d0e344e1a4a2fe'

// Get Biocides question 3
const { data: question } = await supabase
  .from('questions')
  .select('*')
  .eq('parent_section_id', 'f990287b-6a17-43e2-b78e-bed24b977cc7')
  .eq('order_number', 3)
  .single()

console.log('Question 3.1.3:', question?.name)
console.log('Bubble ID:', question?.bubble_id)
console.log('Question Type:', question?.question_type)

// Check if it has choices in Supabase
const { data: supChoices } = await supabase
  .from('choices')
  .select('*')
  .eq('parent_question_id', question?.id)

console.log('\nChoices in Supabase:', supChoices?.length || 0)
supChoices?.forEach(c => console.log(`  - ${c.content}`))

// Check Bubble for choices
console.log('\nFetching from Bubble...')
const response = await fetch(
  `${BUBBLE_API_URL}/obj/choice?constraints=[{"key":"Parent Question","constraint_type":"equals","value":"${question?.bubble_id}"}]`,
  {
    headers: {
      'Authorization': `Bearer ${BUBBLE_API_TOKEN}`
    }
  }
)

const bubbleData = await response.json()
console.log('\nChoices in Bubble:', bubbleData.response?.results?.length || 0)
bubbleData.response?.results?.forEach((c: any) => {
  console.log(`  - ${c.Name || c.Content} (ID: ${c._id})`)
})
