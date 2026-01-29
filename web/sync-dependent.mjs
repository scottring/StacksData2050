import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const BUBBLE_API_URL = 'https://app.stacksdata.com/version-live/api/1.1'
const BUBBLE_API_TOKEN = '25c9fbc54eb17e72b4d0e344e1a4a2fe'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

console.log('=== SYNCING DEPENDENT STATUS FROM BUBBLE ===\n')

// Step 1: Add column if not exists (this will fail silently if exists)
try {
  const { error } = await supabase.rpc('exec_sql', {
    sql: 'ALTER TABLE questions ADD COLUMN IF NOT EXISTS dependent_no_show BOOLEAN DEFAULT false'
  })
  if (error) console.log('Note: Could not add column via RPC, may need manual SQL')
} catch (e) {
  console.log('Column add skipped (may already exist or need manual SQL)')
}

// Step 2: Fetch all questions from Bubble with their dependent status
console.log('Fetching questions from Bubble...')
let allQuestions = []
let cursor = 0
const limit = 100

while (true) {
  const response = await fetch(
    `${BUBBLE_API_URL}/obj/question?limit=${limit}&cursor=${cursor}`,
    { headers: { 'Authorization': `Bearer ${BUBBLE_API_TOKEN}` } }
  )
  const data = await response.json()
  const questions = data.response?.results || []
  
  if (questions.length === 0) break
  
  allQuestions.push(...questions)
  cursor += limit
  
  if (questions.length < limit) break
}

console.log(`Fetched ${allQuestions.length} questions from Bubble`)

// Step 3: Count dependent questions
const dependentQuestions = allQuestions.filter(q => q['Dependent (no show)'] === true)
console.log(`Found ${dependentQuestions.length} dependent questions\n`)

// Step 4: Update Supabase questions by bubble_id
let updated = 0
let notFound = 0

for (const bubbleQ of dependentQuestions) {
  const { data, error } = await supabase
    .from('questions')
    .update({ dependent_no_show: true })
    .eq('bubble_id', bubbleQ._id)
  
  if (error) {
    console.log(`Error updating ${bubbleQ._id}:`, error.message)
  } else {
    // Check if any row was updated
    const { data: check } = await supabase
      .from('questions')
      .select('id')
      .eq('bubble_id', bubbleQ._id)
    
    if (check && check.length > 0) {
      updated++
      console.log(`✓ Updated: ${bubbleQ.Name?.substring(0,50)}`)
    } else {
      notFound++
    }
  }
}

console.log(`\n=== SUMMARY ===`)
console.log(`Updated: ${updated} questions`)
console.log(`Not found in Supabase: ${notFound} questions`)
