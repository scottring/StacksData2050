/**
 * Create DPP (Digital Product Passport) Tag
 *
 * This script creates a new tag for tracking DPP-relevant questions.
 * DPP requirements come into effect in 2027 for packaging materials.
 *
 * Usage: npx tsx create-dpp-tag.ts
 */

import { supabase } from './src/migration/supabase-client.js'

async function createDPPTag() {
  console.log('Creating DPP tag...\n')

  // Check if DPP tag already exists
  const { data: existingTag, error: checkError } = await supabase
    .from('tags')
    .select('id, name')
    .ilike('name', '%DPP%')
    .single()

  if (existingTag) {
    console.log('DPP tag already exists:')
    console.log(`  ID: ${existingTag.id}`)
    console.log(`  Name: ${existingTag.name}`)
    return existingTag
  }

  // Create the DPP tag
  const { data: newTag, error: insertError } = await supabase
    .from('tags')
    .insert({
      name: 'DPP 2027',
      description: 'Digital Product Passport requirements for EU compliance (effective 2027)',
      created_at: new Date().toISOString()
    })
    .select('id, name')
    .single()

  if (insertError) {
    console.error('Error creating DPP tag:', insertError)
    return null
  }

  console.log('DPP tag created successfully:')
  console.log(`  ID: ${newTag.id}`)
  console.log(`  Name: ${newTag.name}`)

  // List existing HQ tags for reference
  const { data: hqTags } = await supabase
    .from('tags')
    .select('id, name')
    .ilike('name', 'HQ%')

  if (hqTags && hqTags.length > 0) {
    console.log('\nExisting HQ tags for reference:')
    hqTags.forEach(tag => {
      console.log(`  - ${tag.name}: ${tag.id}`)
    })
  }

  console.log('\nTo link questions to the DPP tag, add entries to the question_tags table:')
  console.log(`  INSERT INTO question_tags (question_id, tag_id) VALUES ('question-uuid', '${newTag.id}')`)

  return newTag
}

// Optionally link DPP-relevant questions based on keywords
async function linkDPPQuestions(dppTagId: string) {
  console.log('\nSearching for DPP-relevant questions...')

  // Find questions that may be relevant to DPP based on content
  const dppKeywords = [
    'carbon footprint',
    'recyclability',
    'recycled content',
    'sustainability',
    'circular economy',
    'environmental',
    'product composition',
    'material composition',
    'supply chain',
    'traceability',
    'origin',
    'manufacturing location',
    'production site'
  ]

  const { data: allQuestions } = await supabase
    .from('questions')
    .select('id, content, bubble_id')

  if (!allQuestions) {
    console.log('No questions found')
    return
  }

  const dppQuestions = allQuestions.filter(q => {
    const content = q.content?.toLowerCase() || ''
    return dppKeywords.some(keyword => content.includes(keyword.toLowerCase()))
  })

  console.log(`Found ${dppQuestions.length} potentially DPP-relevant questions:`)
  dppQuestions.slice(0, 10).forEach(q => {
    console.log(`  - ${q.content?.substring(0, 80)}...`)
  })

  if (dppQuestions.length > 10) {
    console.log(`  ... and ${dppQuestions.length - 10} more`)
  }

  console.log('\nTo auto-link these questions, run with --link flag')
}

async function main() {
  const tag = await createDPPTag()

  if (tag && process.argv.includes('--link')) {
    await linkDPPQuestions(tag.id)
  }
}

main().catch(console.error)
