import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config()

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const BUBBLE_BASE_URL = process.env.BUBBLE_API_URL!
const BUBBLE_API_TOKEN = process.env.BUBBLE_API_TOKEN!

async function checkBiocides() {
  console.log('=== SUPABASE: BIOCIDES SECTION ===\n')

  // Find Biocides section in Supabase
  const { data: sections } = await supabase
    .from('sections')
    .select('id, name, order_number')
    .ilike('name', '%biocide%')

  console.log('Sections matching "biocide":')
  sections?.forEach(s => console.log(`  ${s.order_number}. ${s.name} (${s.id})`))

  if (!sections || sections.length === 0) {
    console.log('No biocides section found')
    return
  }

  const sectionId = sections[0].id

  // Get subsections
  const { data: subsections } = await supabase
    .from('subsections')
    .select('id, name, order_number')
    .eq('section_id', sectionId)
    .order('order_number')

  console.log('\nSubsections:')
  subsections?.forEach(s => console.log(`  ${s.order_number}. ${s.name}`))

  // Get questions for each subsection
  for (const sub of subsections || []) {
    const { data: questions } = await supabase
      .from('questions')
      .select('id, name, order_number, response_type')
      .eq('subsection_id', sub.id)
      .order('order_number')

    console.log(`\n=== ${sub.name} (subsection ${sub.order_number}) ===`)
    console.log(`Total questions: ${questions?.length || 0}`)
    questions?.forEach(q => {
      console.log(`  ${q.order_number}. [${q.response_type}] ${q.name?.substring(0, 80)}`)
    })
  }

  // Now check Bubble for HQ2.1 Biocides questions
  console.log('\n\n=== BUBBLE: BIOCIDES (HQ2.1) ===\n')

  // Get HQ2.1 tag and Biocides tag
  const tagsUrl = BUBBLE_BASE_URL + '/api/1.1/obj/tag?limit=100'
  const tagsRes = await fetch(tagsUrl, { headers: { Authorization: 'Bearer ' + BUBBLE_API_TOKEN }})
  const tagsData = await tagsRes.json()
  const tagLookup = new Map<string, string>()
  tagsData.response.results.forEach((t: any) => tagLookup.set(t._id, t.Name))

  const hq21TagId = '1681774190520x129918874175406080'

  // Get all questions
  const questionsUrl = BUBBLE_BASE_URL + '/api/1.1/obj/question?limit=500'
  const questionsRes = await fetch(questionsUrl, { headers: { Authorization: 'Bearer ' + BUBBLE_API_TOKEN }})
  const questionsData = await questionsRes.json()
  const allQuestions = questionsData.response.results

  // Find biocide-related questions with HQ2.1 tag
  const biocideQuestions = allQuestions.filter((q: any) => {
    const name = (q.Name || '').toLowerCase()
    const tags = q.Tags || []
    const hasBiocide = name.includes('biocide') || name.includes('bpr') || name.includes('treated article')
    return hasBiocide && tags.includes(hq21TagId)
  })

  biocideQuestions.sort((a: any, b: any) => (a.Order || 999) - (b.Order || 999))

  console.log('HQ2.1 Biocide questions found:', biocideQuestions.length)
  biocideQuestions.forEach((q: any) => {
    const tags = (q.Tags || []).map((tid: string) => tagLookup.get(tid) || tid).join(', ')
    console.log(`  ${q.Order}. [${q['Response type']}] ${(q.Name || '').substring(0, 80)}`)
  })

  // Also find questions NOT in HQ2.1 (old ones)
  const oldBiocideQuestions = allQuestions.filter((q: any) => {
    const name = (q.Name || '').toLowerCase()
    const tags = q.Tags || []
    const hasBiocide = name.includes('biocide') || name.includes('bpr') || name.includes('treated article')
    return hasBiocide && !tags.includes(hq21TagId)
  })

  if (oldBiocideQuestions.length > 0) {
    console.log('\nOLD Biocide questions (NOT in HQ2.1):')
    oldBiocideQuestions.forEach((q: any) => {
      const tags = (q.Tags || []).map((tid: string) => tagLookup.get(tid) || tid).join(', ')
      console.log(`  ${q.Order}. ${(q.Name || '').substring(0, 60)}`)
      console.log(`      Tags: ${tags}`)
    })
  }
}

checkBiocides().catch(console.error)
