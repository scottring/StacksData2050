import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
dotenv.config({ path: path.join(__dirname, '.env') })

const supabaseUrl = process.env.SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function main() {
  console.log('🔍 Auditing HQ2.1 Questions in Database')
  console.log('=' .repeat(80))

  // 1. Get HQ2.1 tag ID
  console.log('\n📌 Fetching HQ2.1 tag...')
  const { data: tag, error: tagError } = await supabase
    .from('tags')
    .select('id, name')
    .eq('name', 'HQ2.1')
    .single()

  if (tagError || !tag) {
    console.error('   ❌ Failed to find HQ2.1 tag:', tagError)
    process.exit(1)
  }

  console.log(`   ✓ Found tag: ${tag.name} (${tag.id})`)

  // 2. Get all HQ2.1 question IDs
  console.log('\n📋 Fetching HQ2.1 questions...')
  const { data: questionTags, error: qtError } = await supabase
    .from('question_tags')
    .select('question_id')
    .eq('tag_id', tag.id)

  if (qtError) {
    console.error('   ❌ Failed to fetch question_tags:', qtError)
    process.exit(1)
  }

  const questionIds = questionTags.map(qt => qt.question_id)
  console.log(`   ✓ Found ${questionIds.length} questions tagged with HQ2.1`)

  // 3. Get question details with section info
  const { data: dbQuestions, error: qError } = await supabase
    .from('questions')
    .select('id, name, parent_section_id, sections!questions_parent_section_id_fkey(name)')
    .in('id', questionIds)
    .order('section_sort_number', { ascending: true })
    .order('subsection_sort_number', { ascending: true })
    .order('order_number', { ascending: true })

  if (qError || !dbQuestions) {
    console.error('   ❌ Failed to fetch questions:', qError)
    process.exit(1)
  }

  console.log(`   ✓ Loaded ${dbQuestions.length} HQ2.1 question details`)

  // 4. Count answers per question
  console.log('\n💾 Counting answers per question...')

  const answerCounts = new Map<string, number>()

  // Get answer counts for all questions at once
  const { data: answerData, error: answerError } = await supabase
    .from('answers')
    .select('parent_question_id')
    .in('parent_question_id', questionIds)

  if (answerError) {
    console.error('   ❌ Failed to fetch answers:', answerError)
    process.exit(1)
  }

  // Count answers per question
  for (const answer of answerData) {
    const count = answerCounts.get(answer.parent_question_id) || 0
    answerCounts.set(answer.parent_question_id, count + 1)
  }

  // 5. Analyze results
  console.log('\n📊 Analysis Results:')

  const questionsWithAnswers = dbQuestions.filter(q => answerCounts.get(q.id)! > 0)
  const questionsWithoutAnswers = dbQuestions.filter(q => !answerCounts.get(q.id))

  console.log(`   Total HQ2.1 questions: ${dbQuestions.length}`)
  console.log(`   Questions WITH answers: ${questionsWithAnswers.length}`)
  console.log(`   Questions WITHOUT answers: ${questionsWithoutAnswers.length}`)
  console.log(`   Total answers: ${answerData.length}`)

  if (questionsWithAnswers.length > 0) {
    const totalAnswers = Array.from(answerCounts.values()).reduce((sum, count) => sum + count, 0)
    const avgAnswers = totalAnswers / questionsWithAnswers.length
    console.log(`   Average answers per question (with answers): ${avgAnswers.toFixed(1)}`)
  }

  // 6. Show distribution by section
  console.log('\n📂 Distribution by Section:')

  const sectionStats = new Map<string, { total: number; withAnswers: number; answerCount: number }>()

  for (const q of dbQuestions) {
    const sectionName = (q.sections as any)?.name || 'Unknown'
    const stats = sectionStats.get(sectionName) || { total: 0, withAnswers: 0, answerCount: 0 }
    stats.total++
    const count = answerCounts.get(q.id) || 0
    if (count > 0) {
      stats.withAnswers++
      stats.answerCount += count
    }
    sectionStats.set(sectionName, stats)
  }

  for (const [section, stats] of Array.from(sectionStats.entries()).sort()) {
    console.log(`   ${section}:`)
    console.log(`      Total questions: ${stats.total}`)
    console.log(`      With answers: ${stats.withAnswers} (${((stats.withAnswers / stats.total) * 100).toFixed(1)}%)`)
    console.log(`      Total answers: ${stats.answerCount}`)
  }

  // 7. Sample questions without answers
  if (questionsWithoutAnswers.length > 0) {
    console.log('\n❌ Sample Questions WITHOUT Answers (first 10):')
    questionsWithoutAnswers.slice(0, 10).forEach(q => {
      const sectionName = (q.sections as any)?.name || 'Unknown'
      console.log(`   - [${sectionName}] ${q.name.substring(0, 80)}...`)
    })
    if (questionsWithoutAnswers.length > 10) {
      console.log(`   ... and ${questionsWithoutAnswers.length - 10} more`)
    }
  }

  // 8. Top 10 questions by answer count
  console.log('\n🔥 Top 10 Questions by Answer Count:')
  const topQuestions = dbQuestions
    .map(q => ({ question: q, count: answerCounts.get(q.id) || 0 }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)

  topQuestions.forEach(({ question, count }) => {
    const sectionName = (question.sections as any)?.name || 'Unknown'
    console.log(`   ${count.toLocaleString()} answers - [${sectionName}] ${question.name.substring(0, 60)}...`)
  })

  console.log('\n✅ Audit complete!')
}

main().catch(console.error)
