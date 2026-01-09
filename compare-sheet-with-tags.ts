import { supabase } from './src/migration/supabase-client.js'
import fetch from 'node-fetch'
import dotenv from 'dotenv'

dotenv.config()

const BUBBLE_BASE_URL = process.env.BUBBLE_API_URL!
const BUBBLE_API_TOKEN = process.env.BUBBLE_API_TOKEN!

async function compareSheetWithTags() {
  console.log('=== Sheet Comparison with Tags ===\n')

  // Get a sheet with HQ2.1 tag
  const { data: hq21Tag } = await supabase
    .from('tags')
    .select('id, bubble_id')
    .eq('name', 'HQ2.1')
    .single()

  const { data: sheetTags } = await supabase
    .from('sheet_tags')
    .select('sheet_id')
    .eq('tag_id', hq21Tag.id)
    .limit(10)

  if (!sheetTags || sheetTags.length === 0) {
    console.log('No sheets with HQ2.1 tag')
    return
  }

  const sheetId = sheetTags[0].sheet_id

  // Get the sheet
  const { data: sheet } = await supabase
    .from('sheets')
    .select('id, name, bubble_id')
    .eq('id', sheetId)
    .single()

  console.log(`Sheet: ${sheet.name}`)
  console.log(`  Supabase ID: ${sheet.id}`)
  console.log(`  Bubble ID: ${sheet.bubble_id}\n`)

  // Get tags for this sheet
  const { data: allSheetTags } = await supabase
    .from('sheet_tags')
    .select('tag_id')
    .eq('sheet_id', sheet.id)

  const sheetTagIds = allSheetTags?.map(st => st.tag_id) || []

  const { data: tagDetails } = await supabase
    .from('tags')
    .select('id, name')
    .in('id', sheetTagIds)

  console.log('Tags for this sheet:')
  for (const tag of tagDetails!) {
    console.log(`  - ${tag.name}`)
  }

  // Get questions that match these tags
  console.log('\n\n=== Questions in Supabase (filtered by tags) ===\n')

  const { data: questionTagLinks } = await supabase
    .from('question_tags')
    .select('question_id')
    .in('tag_id', sheetTagIds)

  const questionIds = [...new Set(questionTagLinks?.map(qt => qt.question_id) || [])]

  const { data: supabaseQuestions } = await supabase
    .from('questions')
    .select('id, name, bubble_id, section_sort_number, subsection_sort_number, order_number')
    .in('id', questionIds)
    .not('section_sort_number', 'is', null)
    .order('section_sort_number')
    .order('subsection_sort_number')
    .order('order_number')
    .limit(20)

  console.log(`Found ${supabaseQuestions?.length} questions for this sheet (showing first 20):\n`)

  if (supabaseQuestions) {
    for (const q of supabaseQuestions) {
      console.log(`  ${q.section_sort_number}.${q.subsection_sort_number}.${q.order_number}: ${q.name?.substring(0, 50)}`)
    }
  }

  // Get questions from Bubble
  console.log('\n\n=== Questions in Bubble (for same tags) ===\n')

  const bubbleTagIds = tagDetails?.map(t => {
    const tag = allSheetTags?.find(st => st.tag_id === t.id)
    return tag ? t : null
  }).filter(Boolean).map(t => {
    const tagDetail = tagDetails?.find(td => td.id === t!.tag_id)
    // Need to get bubble_id for tag
    return null // Will fetch separately
  })

  // Simpler: just check if the questions match
  console.log('Comparing first 10 questions...\n')

  for (let i = 0; i < Math.min(10, supabaseQuestions?.length || 0); i++) {
    const sQ = supabaseQuestions![i]

    const url = `${BUBBLE_BASE_URL}/api/1.1/obj/question/${sQ.bubble_id}`
    const response = await fetch(url, {
      headers: { 'Authorization': `Bearer ${BUBBLE_API_TOKEN}` }
    })
    const data = await response.json() as any

    if (data.response) {
      const bQ = data.response

      // Get subsection order from Bubble
      let bubbleSubOrder = 'undefined'
      if (bQ['Parent Subsection']) {
        const subUrl = `${BUBBLE_BASE_URL}/api/1.1/obj/subsection/${bQ['Parent Subsection']}`
        const subResp = await fetch(subUrl, {
          headers: { 'Authorization': `Bearer ${BUBBLE_API_TOKEN}` }
        })
        const subData = await subResp.json() as any
        if (subData.response && subData.response.Order !== undefined && subData.response.Order !== null) {
          bubbleSubOrder = subData.response.Order.toString()
        }
      }

      const supabaseNum = `${sQ.section_sort_number}.${sQ.subsection_sort_number}.${sQ.order_number}`
      const bubbleNum = `${bQ['SECTION SORT NUMBER']}.${bubbleSubOrder}.${bQ.Order}`

      console.log(`${sQ.name?.substring(0, 50)}`)
      console.log(`  Supabase: ${supabaseNum}`)
      console.log(`  Bubble:   ${bubbleNum}`)
      console.log(supabaseNum === bubbleNum ? '  ✓ Match' : '  ❌ Mismatch')
      console.log()
    }
  }
}

compareSheetWithTags()
