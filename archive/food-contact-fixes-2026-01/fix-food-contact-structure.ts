import { supabase } from './src/migration/supabase-client.js'

// Map subsection names to their 4.x numbers
const subsectionMapping = {
  'General Information': '4.1',
  'European Union - Framework Regulation': '4.2',
  'European Union - National Regulation - Germany: Does the product comply with the requirements of the following BfR (Federal Institute for Risk Assessment) recommendations below?': '4.3',
  'The Netherlands': '4.4',
  'Switzerland': '4.5',
  'Italy': '4.6',
  'France': '4.7',
  'European Union - Plastics & Dual Use Additives': '4.8',
  'USA - Can the product be used for the manufacture of Food Contact Articles in compliance with the U.S. Federal Food Drug and Cosmetic Act and all applicable "Food Additive Regulations" 21CFR part 170-199, especially the following ones?': '4.9',
  'China - Does the product comply with the requirements of the Chinese Food Contact Materials Hygiene Standards specified below?': '4.10',
  'South America: Does the product comply with the requirements of the respective MERCOSUR GMC Resolutions and respective national implementations in Brasil, Paraguay and Uruguay, specified below?': '4.11',
  'Other relevant national legislations in Europe': '4.12'
}

async function fixFoodContactStructure() {
  // Get Food Contact section
  const { data: section } = await supabase
    .from('sections')
    .select('id')
    .eq('name', 'Food Contact')
    .single()

  if (!section) {
    console.log('❌ Food Contact section not found')
    return
  }

  console.log('=== STEP 1: Delete all existing Food Contact subsections ===\n')

  const { data: existingSubsections } = await supabase
    .from('subsections')
    .select('id, name')
    .eq('section_id', section.id)

  console.log(`Found ${existingSubsections?.length || 0} existing subsections`)

  for (const sub of existingSubsections || []) {
    const { error } = await supabase
      .from('subsections')
      .delete()
      .eq('id', sub.id)

    if (error) {
      console.log(`  ❌ Error deleting "${sub.name}": ${error.message}`)
    } else {
      console.log(`  ✓ Deleted "${sub.name}"`)
    }
  }

  console.log('\n=== STEP 2: Create 12 correct subsections (4.1 - 4.12) ===\n')

  const subsectionIdMap: Record<string, string> = {}

  for (const [name, number] of Object.entries(subsectionMapping)) {
    const orderNumber = parseInt(number.split('.')[1])

    const { data: newSub, error } = await supabase
      .from('subsections')
      .insert({
        name: name,
        section_id: section.id,
        order_number: orderNumber,
        show_title_and_group: true,
        created_at: new Date().toISOString(),
        modified_at: new Date().toISOString()
      })
      .select('id')
      .single()

    if (error) {
      console.log(`  ❌ Error creating ${number}: ${error.message}`)
    } else {
      subsectionIdMap[name] = newSub.id
      console.log(`  ✓ Created ${number} - ${name.substring(0, 60)}...`)
    }
  }

  console.log('\n=== STEP 3: Assign all questions to correct subsections ===\n')

  // Get all Food Contact questions
  const { data: questions } = await supabase
    .from('questions')
    .select('id, question_id_number, name, subsection_name_sort')
    .eq('parent_section_id', section.id)
    .order('question_id_number')

  if (!questions) {
    console.log('❌ No questions found')
    return
  }

  console.log(`Found ${questions.length} questions to reassign\n`)

  let assigned = 0
  let unassigned = 0

  for (const question of questions) {
    const subsectionName = question.subsection_name_sort

    if (!subsectionName) {
      console.log(`  ⚠️  Q${question.question_id_number} has no subsection_name_sort`)
      unassigned++
      continue
    }

    const subsectionId = subsectionIdMap[subsectionName]

    if (!subsectionId) {
      console.log(`  ⚠️  Q${question.question_id_number}: Unknown subsection "${subsectionName}"`)
      unassigned++
      continue
    }

    const { error } = await supabase
      .from('questions')
      .update({ parent_subsection_id: subsectionId })
      .eq('id', question.id)

    if (error) {
      console.log(`  ❌ Q${question.question_id_number}: ${error.message}`)
      unassigned++
    } else {
      assigned++
    }
  }

  console.log(`\n✓ Assigned ${assigned} questions`)
  console.log(`⚠️  ${unassigned} questions could not be assigned`)

  console.log('\n=== STEP 4: Verify structure ===\n')

  const { data: finalSubsections } = await supabase
    .from('subsections')
    .select('id, name, order_number')
    .eq('section_id', section.id)
    .order('order_number')

  console.log('Final subsections:')
  for (const sub of finalSubsections || []) {
    const { count } = await supabase
      .from('questions')
      .select('id', { count: 'exact', head: true })
      .eq('parent_subsection_id', sub.id)

    console.log(`  4.${sub.order_number} - ${sub.name.substring(0, 50)}... (${count} questions)`)
  }

  console.log('\n=== COMPLETE ===')
  console.log('Food Contact section now has:')
  console.log(`- ${finalSubsections?.length || 0} subsections (4.1 - 4.12)`)
  console.log(`- ${assigned} questions properly assigned`)
}

fixFoodContactStructure()
