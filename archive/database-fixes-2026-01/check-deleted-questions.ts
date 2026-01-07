import { supabase } from './src/migration/supabase-client.js'

console.log('=== CHECKING ANSWERS WITH DELETED QUESTIONS ===\n')

// Get all answers with orphaned choices
const orphanedChoices = [
  'dc4231ff-387d-4c27-8aeb-1c81738b7d43',
  '3f6353a7-cc0a-4d36-a8a7-a97c623b0d72',
  '513d4977-f90c-4472-9f99-5e28fef3c82d'
]

let allOrphanedAnswers: any[] = []
for (const orphanedChoiceId of orphanedChoices) {
  let page = 0
  const pageSize = 1000

  while (true) {
    const { data: answers } = await supabase
      .from('answers')
      .select('id, parent_question_id')
      .eq('choice_id', orphanedChoiceId)
      .range(page * pageSize, (page + 1) * pageSize - 1)

    if (!answers || answers.length === 0) break
    allOrphanedAnswers = allOrphanedAnswers.concat(answers)
    page++
    if (answers.length < pageSize) break
  }
}

console.log(`Total orphaned answers: ${allOrphanedAnswers.length}`)

// Get unique question IDs
const questionIds = [...new Set(allOrphanedAnswers.map(a => a.parent_question_id).filter(Boolean))]
console.log(`Unique questions referenced: ${questionIds.length}\n`)

// Check which questions actually exist
console.log('Checking which questions exist...\n')

const { data: existingQuestions } = await supabase
  .from('questions')
  .select('id')
  .in('id', questionIds)

const existingQuestionIds = new Set(existingQuestions?.map(q => q.id) || [])

const deletedQuestionIds = questionIds.filter(id => !existingQuestionIds.has(id))

console.log(`Questions that exist: ${existingQuestionIds.size}`)
console.log(`Questions that were DELETED: ${deletedQuestionIds.length}\n`)

// Count answers by deleted vs existing questions
let answersWithDeletedQuestions = 0
let answersWithExistingQuestions = 0

allOrphanedAnswers.forEach(a => {
  if (deletedQuestionIds.includes(a.parent_question_id)) {
    answersWithDeletedQuestions++
  } else if (existingQuestionIds.has(a.parent_question_id)) {
    answersWithExistingQuestions++
  }
})

console.log(`Answers with DELETED questions: ${answersWithDeletedQuestions}`)
console.log(`Answers with existing questions: ${answersWithExistingQuestions}`)

console.log(`\n=== CONCLUSION ===`)
if (answersWithDeletedQuestions > 0) {
  console.log(`⚠️  ${answersWithDeletedQuestions} answers should be DELETED (their questions don't exist)`)
}
if (answersWithExistingQuestions > 0) {
  console.log(`⚠️  ${answersWithExistingQuestions} answers need their questions' choices to be imported from Bubble`)
}
