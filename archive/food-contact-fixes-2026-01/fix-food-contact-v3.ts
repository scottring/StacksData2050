import { supabase } from './src/migration/supabase-client.js'

// Map subsection names to their 4.x numbers (using smart quotes from Bubble)
const subsectionMapping: Record<string, number> = {
  'General Information': 1,
  'European Union - Framework Regulation': 2,
  'European Union - National Regulation - Germany: Does the product comply with the requirements of the following BfR (Federal Institute for Risk Assessment) recommendations below?': 3,
  'The Netherlands': 4,
  'Switzerland': 5,
  'Italy': 6,
  'France': 7,
  'European Union - Plastics & Dual Use Additives': 8,
  'USA - Can the product be used for the manufacture of Food Contact Articles in compliance with the U.S. Federal Food Drug and Cosmetic Act and all applicable "Food Additive Regulations" 21CFR part 170-199, especially the following ones?': 9,  // Note: using smart quotes here
  'China - Does the product comply with the requirements of the Chinese Food Contact Materials Hygiene Standards specified below?': 10,
  'South America: Does the product comply with the requirements of the respective MERCOSUR GMC Resolutions and respective national implementations in Brasil, Paraguay and Uruguay, specified below?': 11,
  'Other relevant national legislations in Europe': 12
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

  console.log('=== STEP 1: Clear ALL subsection assignments (questions AND answers) ===\n')

  // Clear questions
  const { error: clearQuestionsError } = await supabase
    .from('questions')
    .update({ parent_subsection_id: null })
    .eq('parent_section_id', section.id)

  if (clearQuestionsError) {
    console.log(`  ❌ Error clearing question assignments: ${clearQuestionsError.message}`)
    return
  }
  console.log(`  ✓ Cleared question subsection assignments`)

  // Get all subsections to clear
  const { data: oldSubsections } = await supabase
    .from('subsections')
    .select('id')
    .eq('section_id', section.id)

  if (oldSubsections && oldSubsections.length > 0) {
    // Clear answers pointing to these subsections
    for (const sub of oldSubsections) {
      const { error: clearAnswersError } = await supabase
        .from('answers')
        .update({ parent_subsection_id: null })
        .eq('parent_subsection_id', sub.id)

      if (clearAnswersError) {
        console.log(`  ⚠️  Error clearing answers for subsection ${sub.id}: ${clearAnswersError.message}`)
      }
    }
    console.log(`  ✓ Cleared answer subsection assignments`)
  }

  console.log('\n=== STEP 2: Delete ALL existing Food Contact subsections ===\n')

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
      console.log(`  ❌ Error deleting "${sub.name?.substring(0, 40)}...": ${error.message}`)
    } else {
      console.log(`  ✓ Deleted "${sub.name?.substring(0, 40)}..."`)
    }
  }

  console.log('\n=== STEP 3: Create 12 correct subsections (4.1 - 4.12) ===\n')

  const subsectionIdMap: Record<string, string> = {}

  for (const [name, orderNumber] of Object.entries(subsectionMapping)) {
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
      console.log(`  ❌ Error creating 4.${orderNumber}: ${error.message}`)
    } else {
      subsectionIdMap[name] = newSub.id
      console.log(`  ✓ Created 4.${orderNumber} - ${name.substring(0, 50)}...`)
    }
  }

  console.log('\n=== STEP 4: Assign all questions to correct subsections ===\n')

  // Get all Food Contact questions with their Bubble subsection names
  const { data: allQuestions } = await supabase
    .from('questions')
    .select('id, question_id_number, name, subsection_name_sort')
    .eq('parent_section_id', section.id)
    .order('question_id_number')

  if (!allQuestions) {
    console.log('❌ No questions found')
    return
  }

  console.log(`Found ${allQuestions.length} questions to reassign\n`)

  let assigned = 0
  let unassigned = 0
  const unassignedList: any[] = []

  for (const question of allQuestions) {
    const subsectionName = question.subsection_name_sort

    if (!subsectionName) {
      console.log(`  ⚠️  Q${question.question_id_number} has no subsection_name_sort`)
      unassigned++
      unassignedList.push(question)
      continue
    }

    const subsectionId = subsectionIdMap[subsectionName]

    if (!subsectionId) {
      console.log(`  ⚠️  Q${question.question_id_number}: subsection not in map`)
      console.log(`      Name: "${subsectionName}"`)
      unassigned++
      unassignedList.push(question)
      continue
    }

    const { error } = await supabase
      .from('questions')
      .update({ parent_subsection_id: subsectionId })
      .eq('id', question.id)

    if (error) {
      console.log(`  ❌ Q${question.question_id_number}: ${error.message}`)
      unassigned++
      unassignedList.push(question)
    } else {
      assigned++
    }
  }

  console.log(`\n✓ Assigned ${assigned} questions`)
  console.log(`⚠️  ${unassigned} questions could not be assigned`)

  console.log('\n=== STEP 5: Verify final structure ===\n')

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
  console.log(`- ${finalSubsections?.length || 0} subsections`)
  console.log(`- ${assigned}/${allQuestions.length} questions assigned`)
}

fixFoodContactStructure()
