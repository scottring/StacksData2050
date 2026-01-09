import { supabase } from './src/migration/supabase-client.js'
import fetch from 'node-fetch'
import dotenv from 'dotenv'
import { getSupabaseId } from './src/migration/id-mapper.js'

dotenv.config()

const BUBBLE_BASE_URL = process.env.BUBBLE_API_URL!
const BUBBLE_API_TOKEN = process.env.BUBBLE_API_TOKEN!

async function migrateMissingSubsection() {
  const subsectionBubbleId = '1626200588208x767490048310378500'

  console.log('=== Migrating Missing Subsection ===\n')

  // Fetch from Bubble
  const url = `${BUBBLE_BASE_URL}/api/1.1/obj/subsection/${subsectionBubbleId}`
  const response = await fetch(url, {
    headers: { 'Authorization': `Bearer ${BUBBLE_API_TOKEN}` }
  })
  const data = await response.json() as any

  if (!data.response) {
    console.log('Could not fetch from Bubble')
    return
  }

  const bubbleSubsection = data.response
  console.log(`Fetched: ${bubbleSubsection.Name}`)
  console.log(`  Bubble ID: ${bubbleSubsection._id}`)
  console.log(`  Parent Section Bubble ID: ${bubbleSubsection['Parent Section']}`)

  // Get the parent section ID in Supabase
  let sectionId = null
  if (bubbleSubsection['Parent Section']) {
    sectionId = await getSupabaseId(bubbleSubsection['Parent Section'], 'section')
    console.log(`  Parent Section Supabase ID: ${sectionId}`)
  }

  // Determine order_number - need to find what order this should be
  // It's in Food Contact section, so let's count existing subsections
  let orderNumber = 8 // Based on the original issue - this should be 4.8

  if (sectionId) {
    const { data: existing } = await supabase
      .from('subsections')
      .select('order_number')
      .eq('section_id', sectionId)
      .order('order_number', { ascending: false })
      .limit(1)

    if (existing && existing.length > 0 && existing[0].order_number) {
      // Don't increment - use order 8 specifically
      orderNumber = 8
      console.log(`  Assigning order_number: ${orderNumber}`)
    }
  }

  // Insert into Supabase
  console.log('\nInserting into Supabase...')

  const { data: inserted, error } = await supabase
    .from('subsections')
    .insert({
      bubble_id: bubbleSubsection._id,
      name: bubbleSubsection.Name,
      section_id: sectionId,
      order_number: orderNumber,
      created_at: bubbleSubsection['Created Date'],
      modified_at: bubbleSubsection['Modified Date']
    })
    .select()
    .single()

  if (error) {
    console.log(`❌ Failed to insert: ${error.message}`)
    return
  }

  console.log(`✓ Subsection migrated successfully`)
  console.log(`  Supabase ID: ${inserted.id}`)
  console.log(`  Name: ${inserted.name}`)
  console.log(`  Order: ${inserted.order_number}`)

  // Now update all questions that reference this subsection
  console.log('\nUpdating questions that reference this subsection...')

  const { data: questions } = await supabase
    .from('questions')
    .select('id, name, bubble_id')
    .is('subsection_sort_number', null)
    .limit(100)

  if (!questions || questions.length === 0) {
    console.log('No questions to update')
    return
  }

  let fixed = 0
  for (const q of questions) {
    // Fetch from Bubble to check if it belongs to this subsection
    const qUrl = `${BUBBLE_BASE_URL}/api/1.1/obj/question/${q.bubble_id}`
    const qResponse = await fetch(qUrl, {
      headers: { 'Authorization': `Bearer ${BUBBLE_API_TOKEN}` }
    })
    const qData = await qResponse.json() as any

    if (qData.response && qData.response['Parent Subsection'] === subsectionBubbleId) {
      const { error: updateError } = await supabase
        .from('questions')
        .update({
          parent_subsection_id: inserted.id,
          subsection_sort_number: orderNumber
        })
        .eq('id', q.id)

      if (!updateError) {
        console.log(`  ✓ Fixed: ${q.name?.substring(0, 50)}`)
        fixed++
      }
    }
  }

  console.log(`\n✓ Fixed ${fixed} questions`)
}

migrateMissingSubsection()
