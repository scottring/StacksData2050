import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config()

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function fixBiocides() {
  console.log('=== FIXING BIOCIDES SECTION ===\n')

  // 1. Delete the "Automatic #1" empty subsection
  console.log('1. Deleting "Automatic #1" empty subsection...')
  const { data: autoSub } = await supabase
    .from('subsections')
    .select('id')
    .eq('name', 'Automatic #1')
    .single()

  if (autoSub) {
    const { error } = await supabase
      .from('subsections')
      .delete()
      .eq('id', autoSub.id)

    if (error) {
      console.log('   Error:', error.message)
    } else {
      console.log('   ✓ Deleted Automatic #1 subsection')
    }
  } else {
    console.log('   (not found)')
  }

  // 2. Get Biocides subsection
  const { data: biocidesSub } = await supabase
    .from('subsections')
    .select('id')
    .eq('name', 'Biocides')
    .single()

  if (!biocidesSub) {
    console.log('Biocides subsection not found!')
    return
  }

  // 3. Delete questions NOT in HQ2.1
  console.log('\n2. Deleting questions NOT in HQ2.1...')

  // Question 3: "in-can preservation (PT 6)" - NOT IN BUBBLE AT ALL
  const { data: q3 } = await supabase
    .from('questions')
    .select('id, name')
    .eq('subsection_id', biocidesSub.id)
    .ilike('name', '%in-can preservation%')
    .single()

  if (q3) {
    await supabase.from('answers').delete().eq('question_id', q3.id)
    await supabase.from('question_tags').delete().eq('question_id', q3.id)
    const { error } = await supabase.from('questions').delete().eq('id', q3.id)
    if (error) {
      console.log('   Error deleting q3:', error.message)
    } else {
      console.log('   ✓ Deleted: "' + q3.name?.substring(0, 50) + '..."')
    }
  }

  // Question 10: "Article 95 list... PT 11" - Only HQ 2.0.1
  const { data: q10 } = await supabase
    .from('questions')
    .select('id, name, order_number')
    .eq('subsection_id', biocidesSub.id)
    .eq('order_number', 10)
    .single()

  if (q10) {
    await supabase.from('answers').delete().eq('question_id', q10.id)
    await supabase.from('question_tags').delete().eq('question_id', q10.id)
    const { error } = await supabase.from('questions').delete().eq('id', q10.id)
    if (error) {
      console.log('   Error deleting q10:', error.message)
    } else {
      console.log('   ✓ Deleted: "' + q10.name?.substring(0, 50) + '..."')
    }
  }

  // 4. Fix order numbers to be sequential
  console.log('\n3. Fixing order numbers...')

  // Get remaining questions
  const { data: questions } = await supabase
    .from('questions')
    .select('id, name, order_number')
    .eq('subsection_id', biocidesSub.id)
    .order('order_number')

  console.log('   Current questions:')
  questions?.forEach(q => console.log(`     ${q.order_number}. ${q.name?.substring(0, 60)}`))

  // New order mapping:
  // 1 -> 1, 2 -> 2, 4 -> 3, 5 -> 4, 6 -> 5, 8 -> 6, 9 -> 7, 11 -> 8
  const orderMapping: Record<number, number> = {
    1: 1,
    2: 2,
    4: 3,
    5: 4,
    6: 5,
    8: 6,
    9: 7,
    11: 8
  }

  for (const q of questions || []) {
    const newOrder = orderMapping[q.order_number as number]
    if (newOrder && newOrder !== q.order_number) {
      await supabase
        .from('questions')
        .update({ order_number: newOrder })
        .eq('id', q.id)
      console.log(`   ✓ ${q.order_number} -> ${newOrder}: ${q.name?.substring(0, 50)}`)
    }
  }

  // 5. Verify final state
  console.log('\n=== VERIFICATION ===')

  const { data: finalQuestions } = await supabase
    .from('questions')
    .select('id, name, order_number, response_type')
    .eq('subsection_id', biocidesSub.id)
    .order('order_number')

  console.log('\nBiocides questions (final):')
  finalQuestions?.forEach(q => {
    console.log(`  ${q.order_number}. [${q.response_type}] ${q.name?.substring(0, 70)}`)
  })

  console.log('\n=== DONE ===')
}

fixBiocides().catch(console.error)
