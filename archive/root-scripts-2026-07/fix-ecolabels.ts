import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config()

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function fixEcolabels() {
  console.log('=== FIXING ECOLABELS SECTION ===\n')

  // 1. Delete the "test section Kaisa" duplicate section
  console.log('1. Deleting "test section Kaisa" duplicate section...')
  const { data: testSection } = await supabase
    .from('sections')
    .select('id')
    .eq('name', 'test section Kaisa')
    .single()

  if (testSection) {
    const { error } = await supabase
      .from('sections')
      .delete()
      .eq('id', testSection.id)

    if (error) {
      console.log('   Error deleting test section:', error.message)
    } else {
      console.log('   ✓ Deleted test section Kaisa')
    }
  } else {
    console.log('   (not found - already deleted?)')
  }

  // 2. Delete OLD EU Ecolabel questions (2012/481/EU and 2014/256/EU)
  console.log('\n2. Deleting OLD EU Ecolabel questions (HQ 2.0.1 only)...')

  const oldQuestionNames = [
    '2012/481/EU',
    '2014/256/EU'
  ]

  for (const nameFragment of oldQuestionNames) {
    const { data: question } = await supabase
      .from('questions')
      .select('id, name')
      .ilike('name', `%${nameFragment}%`)
      .single()

    if (question) {
      // First delete any answers for this question
      await supabase
        .from('answers')
        .delete()
        .eq('question_id', question.id)

      // Then delete question_tags
      await supabase
        .from('question_tags')
        .delete()
        .eq('question_id', question.id)

      // Then delete the question
      const { error } = await supabase
        .from('questions')
        .delete()
        .eq('id', question.id)

      if (error) {
        console.log(`   Error deleting ${nameFragment}:`, error.message)
      } else {
        console.log(`   ✓ Deleted: ${question.name?.substring(0, 60)}...`)
      }
    } else {
      console.log(`   (${nameFragment} not found - already deleted?)`)
    }
  }

  // 3. Fix EU Ecolabel subsection question order numbers
  console.log('\n3. Fixing EU Ecolabel question order numbers...')

  const { data: euSubsection } = await supabase
    .from('subsections')
    .select('id')
    .ilike('name', '%EU Ecolabel%')
    .single()

  if (euSubsection) {
    const { data: euQuestions } = await supabase
      .from('questions')
      .select('id, name, order_number')
      .eq('subsection_id', euSubsection.id)
      .order('order_number')

    console.log('   Current EU Ecolabel questions:')
    euQuestions?.forEach(q => console.log(`     ${q.order_number}. ${q.name?.substring(0, 60)}`))

    // Expected order based on Excel template:
    // 1. Commission Decision (EU) 2020/1803 - ANNEX
    // 2. Commission Decision (EU) 2019/70 - ANNEX I
    // 3. Commission Decision (EU) 2019/70 - ANNEX II

    const orderMap = [
      { fragment: '2020/1803', order: 1 },
      { fragment: '2019/70 - ANNEX I', order: 2 },
      { fragment: '2019/70 - ANNEX II', order: 3 }
    ]

    for (const mapping of orderMap) {
      const question = euQuestions?.find(q => q.name?.includes(mapping.fragment))
      if (question && question.order_number !== mapping.order) {
        await supabase
          .from('questions')
          .update({ order_number: mapping.order })
          .eq('id', question.id)
        console.log(`   ✓ Updated "${mapping.fragment}" to order ${mapping.order}`)
      }
    }
  }

  // 4. Fix Blue Angel question order numbers and response types
  console.log('\n4. Fixing Blue Angel question order numbers and response types...')

  const { data: baSubsection } = await supabase
    .from('subsections')
    .select('id')
    .ilike('name', '%Blue Angel%')
    .single()

  if (baSubsection) {
    const { data: baQuestions } = await supabase
      .from('questions')
      .select('id, name, order_number, response_type')
      .eq('subsection_id', baSubsection.id)
      .order('order_number')

    console.log('   Current Blue Angel questions:')
    baQuestions?.forEach(q => console.log(`     ${q.order_number}. [${q.response_type}] ${q.name?.substring(0, 50)}`))

    // Expected order:
    // 1. DE-UZ 5
    // 2. DE-UZ 14a
    // 3. DE-UZ 14b
    // 4. DE-UZ 56
    // 5. DE-UZ 72
    // 6. DE-UZ 217a
    // 7. DE-UZ 217b

    const baOrderMap = [
      { fragment: 'DE-UZ-5', order: 1 },
      { fragment: 'DE-UZ 5', order: 1 },
      { fragment: 'DE-UZ 14a', order: 2 },
      { fragment: 'DE-UZ 14b', order: 3 },
      { fragment: 'DE-UZ 56', order: 4 },
      { fragment: 'DE-UZ 72', order: 5 },
      { fragment: 'DE-UZ 217a', order: 6 },
      { fragment: 'DE-UZ 217b', order: 7 }
    ]

    for (const mapping of baOrderMap) {
      const question = baQuestions?.find(q => q.name?.includes(mapping.fragment))
      if (question) {
        const updates: any = {}
        if (question.order_number !== mapping.order) {
          updates.order_number = mapping.order
        }
        // Fix response type for 217a and 217b
        if (mapping.fragment.includes('217') && question.response_type !== 'Select one Radio') {
          updates.response_type = 'Select one Radio'
        }

        if (Object.keys(updates).length > 0) {
          await supabase
            .from('questions')
            .update(updates)
            .eq('id', question.id)
          console.log(`   ✓ Updated "${mapping.fragment}" - order: ${mapping.order}, type: Select one Radio`)
        }
      }
    }
  }

  // 5. Fix Nordic Ecolabel question order numbers
  console.log('\n5. Fixing Nordic Ecolabel question order numbers...')

  const { data: nordicSubsection } = await supabase
    .from('subsections')
    .select('id')
    .ilike('name', '%Nordic Ecolabel%')
    .single()

  if (nordicSubsection) {
    const { data: nordicQuestions } = await supabase
      .from('questions')
      .select('id, name, order_number')
      .eq('subsection_id', nordicSubsection.id)
      .order('order_number')

    // Expected order:
    // 1. Paper Products - Chemical Module
    // 2. Tissue Paper - Supplementary Module
    // 3. Grease-proof Paper - Supplementary Module
    // 4. Packaging for Liquid Foods
    // 5. Disposables for Food

    const nordicOrderMap = [
      { fragment: 'Paper Products', order: 1 },
      { fragment: 'Tissue Paper', order: 2 },
      { fragment: 'Grease-proof', order: 3 },
      { fragment: 'Packaging for Liquid', order: 4 },
      { fragment: 'Disposables', order: 5 }
    ]

    for (const mapping of nordicOrderMap) {
      const question = nordicQuestions?.find(q => q.name?.includes(mapping.fragment))
      if (question && question.order_number !== mapping.order) {
        await supabase
          .from('questions')
          .update({ order_number: mapping.order })
          .eq('id', question.id)
        console.log(`   ✓ Updated "${mapping.fragment}" to order ${mapping.order}`)
      }
    }
  }

  // 6. Verify final state
  console.log('\n=== VERIFICATION ===\n')

  const { data: ecolabelsSection } = await supabase
    .from('sections')
    .select('id')
    .eq('name', 'Ecolabels')
    .single()

  if (ecolabelsSection) {
    const { data: subsections } = await supabase
      .from('subsections')
      .select('id, name, order_number')
      .eq('section_id', ecolabelsSection.id)
      .order('order_number')

    for (const sub of subsections || []) {
      const { data: questions } = await supabase
        .from('questions')
        .select('id, name, order_number, response_type')
        .eq('subsection_id', sub.id)
        .order('order_number')

      console.log(`${sub.name} (subsection ${sub.order_number}):`)
      questions?.forEach(q => {
        console.log(`  ${q.order_number}. [${q.response_type}] ${q.name?.substring(0, 70)}`)
      })
      console.log('')
    }
  }

  console.log('=== DONE ===')
}

fixEcolabels().catch(console.error)
