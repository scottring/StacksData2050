import { supabase } from './src/migration/supabase-client.js';

async function debugDisclaimer() {
  const sheetId = '548f08be-3b2a-465f-94b4-a2279bee9819'

  // Find the "Add disclaimer" question
  const { data: disclaimerQuestion } = await supabase
    .from('questions')
    .select('*')
    .ilike('name', '%disclaimer%')
    .limit(1)
    .single()

  console.log('=== DISCLAIMER QUESTION ===')
  console.log('Name:', disclaimerQuestion?.name)
  console.log('ID:', disclaimerQuestion?.id)
  console.log('Order:', disclaimerQuestion?.order_number)
  console.log('parent_section_id:', disclaimerQuestion?.parent_section_id)
  console.log('parent_subsection_id:', disclaimerQuestion?.parent_subsection_id)

  if (disclaimerQuestion?.parent_subsection_id) {
    // Try to find the subsection
    const { data: subsection } = await supabase
      .from('subsections')
      .select('*')
      .eq('id', disclaimerQuestion.parent_subsection_id)
      .single()

    console.log('\n=== SUBSECTION FOR DISCLAIMER ===')
    if (subsection) {
      console.log('Name:', subsection.name)
      console.log('ID:', subsection.id)
      console.log('Order:', subsection.order_number)
      console.log('section_id:', subsection.section_id)
    } else {
      console.log('⚠️  SUBSECTION NOT FOUND!')
      console.log('Looking for ID:', disclaimerQuestion.parent_subsection_id)
    }
  }

  // Find ALL subsections with "disclaimer" in the name
  const { data: allDisclaimerSubs } = await supabase
    .from('subsections')
    .select('*')
    .ilike('name', '%disclaimer%')

  console.log('\n=== ALL DISCLAIMER SUBSECTIONS ===')
  if (allDisclaimerSubs && allDisclaimerSubs.length > 0) {
    allDisclaimerSubs.forEach(sub => {
      console.log(`Name: ${sub.name}`)
      console.log(`ID: ${sub.id}`)
      console.log(`Order: ${sub.order_number}`)
      console.log(`section_id: ${sub.section_id}`)
      console.log('---')
    })
  } else {
    console.log('No subsections found with "disclaimer" in name')
  }
}

debugDisclaimer().catch(console.error)
