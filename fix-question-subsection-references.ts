import { supabase } from './src/migration/supabase-client.js'
import { getSupabaseId } from './src/migration/id-mapper.js'
import fetch from 'node-fetch'
import dotenv from 'dotenv'

dotenv.config()

const BUBBLE_BASE_URL = process.env.BUBBLE_API_URL!
const BUBBLE_API_TOKEN = process.env.BUBBLE_API_TOKEN!

async function fixQuestionSubsectionReferences() {
  console.log('=== Fixing Question Subsection References ===\n')

  // Get questions with null subsection_sort_number
  const { data: questions } = await supabase
    .from('questions')
    .select('id, bubble_id, name, parent_subsection_id, subsection_sort_number')
    .is('subsection_sort_number', null)

  if (!questions || questions.length === 0) {
    console.log('No questions to fix')
    return
  }

  console.log(`Found ${questions.length} questions with null subsection_sort_number\n`)

  let fixed = 0
  let errors = 0
  let notFound = 0

  for (const question of questions) {
    try {
      // Fetch the question from Bubble to get the correct Parent Subsection
      const url = `${BUBBLE_BASE_URL}/api/1.1/obj/question/${question.bubble_id}`
      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${BUBBLE_API_TOKEN}` }
      })
      const bubbleQuestion = await response.json() as any

      if (!bubbleQuestion.response) {
        console.log(`❌ Question ${question.bubble_id} not found in Bubble`)
        notFound++
        continue
      }

      const bubbleSubsectionId = bubbleQuestion.response['Parent Subsection']

      if (!bubbleSubsectionId) {
        console.log(`  Question has no Parent Subsection in Bubble: ${question.name?.substring(0, 50)}`)
        notFound++
        continue
      }

      // Get the correct Supabase subsection ID
      const supabaseSubsectionId = await getSupabaseId(bubbleSubsectionId, 'subsection')

      if (!supabaseSubsectionId) {
        console.log(`  Subsection not found in Supabase: ${bubbleSubsectionId}`)
        notFound++
        continue
      }

      // Get the subsection's order number
      const { data: subsection } = await supabase
        .from('subsections')
        .select('order_number')
        .eq('id', supabaseSubsectionId)
        .maybeSingle()

      if (!subsection || subsection.order_number === null) {
        console.log(`  Subsection has no order_number: ${supabaseSubsectionId}`)
        notFound++
        continue
      }

      // Update the question
      const { error } = await supabase
        .from('questions')
        .update({
          parent_subsection_id: supabaseSubsectionId,
          subsection_sort_number: subsection.order_number
        })
        .eq('id', question.id)

      if (error) {
        console.log(`❌ Failed to update question ${question.id}: ${error.message}`)
        errors++
      } else {
        fixed++
        if (fixed % 10 === 0) {
          console.log(`Progress: ${fixed} questions fixed...`)
        }
      }
    } catch (err) {
      console.log(`❌ Error processing question ${question.id}: ${err}`)
      errors++
    }
  }

  console.log(`\n=== Complete ===`)
  console.log(`Fixed: ${fixed}`)
  console.log(`Not found: ${notFound}`)
  console.log(`Errors: ${errors}`)
}

fixQuestionSubsectionReferences()
