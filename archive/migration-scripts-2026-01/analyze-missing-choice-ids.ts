import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function analyzeMissingChoiceIds() {
  console.log('=== Analyzing Missing choice_id Values Across All Sheets ===\n')

  // Get all answers
  const { data: allAnswers, count: totalCount } = await supabase
    .from('answers')
    .select('*', { count: 'exact' })

  console.log(`Total answers: ${totalCount}\n`)

  // Get all questions with their types
  const { data: questions } = await supabase
    .from('questions')
    .select('id, name, question_type, parent_subsection_id, parent_section_id')

  // Map question IDs to their types
  const questionTypeMap = new Map(questions?.map(q => [q.id, q.question_type]) || [])

  // Analyze answers by question type
  const answersByType = new Map<string, { total: number, withChoice: number, withoutChoice: number }>()

  allAnswers?.forEach(answer => {
    const questionType = questionTypeMap.get(answer.parent_question_id) || 'Unknown'

    if (!answersByType.has(questionType)) {
      answersByType.set(questionType, { total: 0, withChoice: 0, withoutChoice: 0 })
    }

    const stats = answersByType.get(questionType)!
    stats.total++

    if (answer.choice_id) {
      stats.withChoice++
    } else {
      stats.withoutChoice++
    }
  })

  console.log('=== Answers by Question Type ===\n')
  const sortedTypes = Array.from(answersByType.entries()).sort((a, b) => b[1].total - a[1].total)

  sortedTypes.forEach(([type, stats]) => {
    const percentWithout = ((stats.withoutChoice / stats.total) * 100).toFixed(1)
    console.log(`${type || 'NULL'}:`)
    console.log(`  Total: ${stats.total}`)
    console.log(`  With choice_id: ${stats.withChoice}`)
    console.log(`  WITHOUT choice_id: ${stats.withoutChoice} (${percentWithout}%)`)
    console.log('')
  })

  // Find questions that SHOULD have choices but have NULL
  console.log('=== Radio/Select Questions with NULL choice_id ===\n')

  const radioSelectTypes = [
    'Select one Radio',
    'Select Many Checkboxes',
    'Radio buttons',
    'Checkbox',
    'yes_no',
    'boolean'
  ]

  const problematicQuestions = new Map<string, { question: any, nullCount: number, totalCount: number }>()

  allAnswers?.forEach(answer => {
    const questionType = questionTypeMap.get(answer.parent_question_id)

    if (radioSelectTypes.includes(questionType || '')) {
      const questionId = answer.parent_question_id

      if (!problematicQuestions.has(questionId)) {
        const question = questions?.find(q => q.id === questionId)
        problematicQuestions.set(questionId, {
          question,
          nullCount: 0,
          totalCount: 0
        })
      }

      const stats = problematicQuestions.get(questionId)!
      stats.totalCount++

      if (!answer.choice_id && !answer.boolean_value) {
        stats.nullCount++
      }
    }
  })

  const problematicList = Array.from(problematicQuestions.entries())
    .filter(([_, stats]) => stats.nullCount > 0)
    .sort((a, b) => b[1].nullCount - a[1].nullCount)

  console.log(`Found ${problematicList.length} questions with NULL choice_id/boolean_value\n`)

  problematicList.slice(0, 20).forEach(([questionId, stats]) => {
    const q = stats.question
    console.log(`${q?.name?.substring(0, 60)}...`)
    console.log(`  Type: ${questionTypeMap.get(questionId)}`)
    console.log(`  NULL answers: ${stats.nullCount} / ${stats.totalCount}`)
    console.log(`  Question ID: ${questionId}`)
    console.log('')
  })

  // Summary statistics
  console.log('=== Summary ===\n')

  const totalRadioSelectAnswers = allAnswers?.filter(a => {
    const qType = questionTypeMap.get(a.parent_question_id)
    return radioSelectTypes.includes(qType || '')
  }).length || 0

  const radioSelectWithNull = allAnswers?.filter(a => {
    const qType = questionTypeMap.get(a.parent_question_id)
    return radioSelectTypes.includes(qType || '') && !a.choice_id && a.boolean_value === null
  }).length || 0

  const percentBroken = ((radioSelectWithNull / totalRadioSelectAnswers) * 100).toFixed(2)

  console.log(`Radio/Select question answers: ${totalRadioSelectAnswers}`)
  console.log(`Missing choice_id: ${radioSelectWithNull} (${percentBroken}%)`)
  console.log(`\nThis is a systematic migration issue that affects ${problematicList.length} questions`)
}

analyzeMissingChoiceIds().catch(console.error)
