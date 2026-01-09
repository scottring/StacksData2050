import { supabase } from './src/migration/supabase-client.js'

async function compareHQTags() {
  console.log('=== Comparing HQ Tags ===\n')

  // Get all tags
  const { data: tags } = await supabase
    .from('tags')
    .select('*')
    .order('name')

  console.log('All tags in Supabase:\n')
  for (const tag of tags!) {
    console.log(`  ${tag.name}`)
    console.log(`    ID: ${tag.id}`)
    console.log(`    Bubble ID: ${tag.bubble_id}`)
  }

  // Get HQ 2.0.1 tag
  console.log('\n\n=== HQ 2.0.1 Tag Details ===\n')

  const { data: hq201 } = await supabase
    .from('tags')
    .select('*')
    .eq('name', 'HQ 2.0.1')
    .maybeSingle()

  if (hq201) {
    console.log(`Tag: ${hq201.name}`)
    console.log(`  ID: ${hq201.id}`)
    console.log(`  Bubble ID: ${hq201.bubble_id}`)

    // Count questions with this tag
    const { count: questionCount } = await supabase
      .from('question_tags')
      .select('question_id', { count: 'exact', head: true })
      .eq('tag_id', hq201.id)

    console.log(`  Questions with this tag: ${questionCount}`)

    // Count sheets with this tag
    const { count: sheetCount } = await supabase
      .from('sheet_tags')
      .select('sheet_id', { count: 'exact', head: true })
      .eq('tag_id', hq201.id)

    console.log(`  Sheets with this tag: ${sheetCount}`)
  }

  // Get HQ2.1 tag
  console.log('\n\n=== HQ2.1 Tag Details ===\n')

  const { data: hq21 } = await supabase
    .from('tags')
    .select('*')
    .eq('name', 'HQ2.1')
    .maybeSingle()

  if (hq21) {
    console.log(`Tag: ${hq21.name}`)
    console.log(`  ID: ${hq21.id}`)
    console.log(`  Bubble ID: ${hq21.bubble_id}`)

    // Count questions with this tag
    const { count: questionCount } = await supabase
      .from('question_tags')
      .select('question_id', { count: 'exact', head: true })
      .eq('tag_id', hq21.id)

    console.log(`  Questions with this tag: ${questionCount}`)

    // Count sheets with this tag
    const { count: sheetCount } = await supabase
      .from('sheet_tags')
      .select('sheet_id', { count: 'exact', head: true })
      .eq('tag_id', hq21.id)

    console.log(`  Sheets with this tag: ${sheetCount}`)
  } else {
    console.log('❌ HQ2.1 tag NOT FOUND in Supabase')
  }

  // Check which questions differ between the two tags
  if (hq201 && hq21) {
    console.log('\n\n=== Questions Unique to Each Tag ===\n')

    const { data: hq201Questions } = await supabase
      .from('question_tags')
      .select('question_id')
      .eq('tag_id', hq201.id)

    const { data: hq21Questions } = await supabase
      .from('question_tags')
      .select('question_id')
      .eq('tag_id', hq21.id)

    const hq201Set = new Set(hq201Questions?.map(q => q.question_id) || [])
    const hq21Set = new Set(hq21Questions?.map(q => q.question_id) || [])

    const onlyIn201 = [...hq201Set].filter(id => !hq21Set.has(id))
    const onlyIn21 = [...hq21Set].filter(id => !hq201Set.has(id))

    console.log(`Questions only in HQ 2.0.1: ${onlyIn201.length}`)
    console.log(`Questions only in HQ2.1: ${onlyIn21.length}`)
    console.log(`Questions in both: ${[...hq201Set].filter(id => hq21Set.has(id)).length}`)
  }
}

compareHQTags()
