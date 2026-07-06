import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config()

const supabase = createClient(
  process.env.SUPABASE_URL as string,
  process.env.SUPABASE_SERVICE_ROLE_KEY as string
)

async function checkSheetTags() {
  // Get the most recent sheet named KTEST
  const { data: sheet } = await supabase
    .from('sheets')
    .select('id, name')
    .ilike('name', 'KTEST%')
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  console.log('Sheet:', sheet)

  if (!sheet) return

  // Get sheet tags
  const { data: sheetTags } = await supabase
    .from('sheet_tags')
    .select('tag_id, tags(name)')
    .eq('sheet_id', sheet.id)

  console.log('Sheet tags:', sheetTags)

  if (!sheetTags || sheetTags.length === 0) {
    console.log('No tags on sheet!')
    return
  }

  const tagIds = sheetTags.map(st => st.tag_id)

  // Check if the biocide questions (specifically the dependent one) are tagged
  const biocideQuestionId = '79dc438f-fbb6-432e-b64b-a7097cd61b9f' // Q1 (parent)
  const dependentQuestionId = 'need-to-find' // Q2 (dependent)

  // Get Q2 ID
  const { data: q2 } = await supabase
    .from('questions')
    .select('id, name')
    .ilike('name', '%If yes, please specify the substance%')
    .limit(1)
    .single()

  console.log('\nDependent question:', q2)

  if (q2) {
    // Check if Q2 is tagged with any of the sheet's tags
    const { data: q2Tags } = await supabase
      .from('question_tags')
      .select('tag_id, tags(name)')
      .eq('question_id', q2.id)

    console.log('Q2 tags:', q2Tags)

    // Check if any of Q2's tags match the sheet's tags
    const q2TagIds = q2Tags?.map(qt => qt.tag_id) || []
    const matchingTags = q2TagIds.filter(id => tagIds.includes(id))
    console.log('\nMatching tags between sheet and Q2:', matchingTags.length > 0 ? matchingTags : 'NONE - Q2 will not appear!')
  }

  // Check parent question tags
  const { data: parentTags } = await supabase
    .from('question_tags')
    .select('tag_id, tags(name)')
    .eq('question_id', biocideQuestionId)

  console.log('\nParent question (Q1) tags:', parentTags)
}

checkSheetTags()
