import { supabase } from './src/migration/supabase-client.js';

async function verifyFix() {
  const sheetId = '548f08be-3b2a-465f-94b4-a2279bee9819'

  // Get all sections with their subsections
  const { data: sections } = await supabase
    .from('sections')
    .select('*')
    .order('order_number')

  console.log('=== SHEET STRUCTURE ===\n')

  for (const section of sections || []) {
    // Only show sections with numbered order
    if (section.order_number === null) continue

    const { data: subsections } = await supabase
      .from('subsections')
      .select('id, name, order_number')
      .eq('section_id', section.id)
      .not('order_number', 'is', null)
      .order('order_number')

    // Count visible questions
    let totalQuestions = 0
    for (const sub of subsections || []) {
      const { count } = await supabase
        .from('questions')
        .select('id', { count: 'exact', head: true })
        .eq('parent_subsection_id', sub.id)

      totalQuestions += count || 0
    }

    if ((subsections && subsections.length > 0) || totalQuestions > 0) {
      console.log(`${section.order_number}. ${section.name}`)

      if (subsections && subsections.length > 0) {
        for (let i = 0; i < subsections.length; i++) {
          const sub = subsections[i]
          const { count: qCount } = await supabase
            .from('questions')
            .select('id', { count: 'exact', head: true })
            .eq('parent_subsection_id', sub.id)

          console.log(`   ${section.order_number}.${i + 1} ${sub.name} (${qCount || 0} questions)`)
        }
      }
      console.log()
    }
  }

  console.log('=== SPECIFIC CHECKS ===\n')

  // Check Product Information
  console.log('Product Information subsections:')
  const { data: productSubs } = await supabase
    .from('subsections')
    .select('name, order_number')
    .eq('section_id', 'b6ea81fe-9c6f-45e8-8cd9-f025b414212a')
    .not('order_number', 'is', null)
    .order('order_number')

  productSubs?.forEach((sub, idx) => {
    console.log(`  ${idx + 1}. ${sub.name} (order: ${sub.order_number})`)
  })

  // Check Food Contact
  console.log('\nFood Contact subsections (first 3):')
  const { data: foodSubs } = await supabase
    .from('subsections')
    .select('name, order_number')
    .eq('section_id', '558c9176-447d-4eff-af6e-a953c4f4fead')
    .not('order_number', 'is', null)
    .order('order_number')
    .limit(3)

  foodSubs?.forEach((sub, idx) => {
    console.log(`  ${idx + 1}. ${sub.name} (order: ${sub.order_number})`)
  })

  console.log('\n✅ Verification complete!')
}

verifyFix().catch(console.error)
