import { supabase } from './src/migration/supabase-client.js'

/**
 * Comprehensive data validation and fix script for production sheets
 *
 * This script:
 * 1. Identifies radio/select questions with NULL choice_ids
 * 2. Filters out test sheets to focus on production data
 * 3. Provides options to auto-fix or manually review
 */

async function validateAndFixProductionData() {
  console.log('=== Production Data Validation & Fix Tool ===\n')

  // Step 1: Identify test sheets to exclude
  const testSheetPatterns = ['test', 'Test', 'TEST', 'import test', 'Unknown']

  const { data: allSheets } = await supabase
    .from('sheets')
    .select('id, name')

  const testSheets = allSheets?.filter(s =>
    s.name && testSheetPatterns.some(pattern => s.name.includes(pattern))
  ) || []

  const productionSheets = allSheets?.filter(s =>
    s.name && !testSheetPatterns.some(pattern => s.name.includes(pattern))
  ) || []

  console.log(`Total sheets: ${allSheets?.length || 0}`)
  console.log(`Production sheets: ${productionSheets.length}`)
  console.log(`Test sheets: ${testSheets.length}\n`)

  // Step 2: Find radio/select questions
  const radioSelectTypes = [
    'Select one Radio',
    'Select Many Checkboxes',
    'Radio buttons',
    'Checkbox',
    'yes_no',
    'boolean'
  ]

  const { data: questions } = await supabase
    .from('questions')
    .select('*')
    .in('question_type', radioSelectTypes)

  console.log(`Radio/Select questions: ${questions?.length || 0}\n`)

  // Step 3: Find NULL answers in production sheets only
  const productionSheetIds = productionSheets.map(s => s.id)

  console.log('Analyzing production sheets for data quality issues...\n')

  const issuesByQuestion = new Map<string, {
    question: any,
    nullAnswers: any[],
    totalProductionAnswers: number
  }>()

  for (const question of questions || []) {
    const { data: answers } = await supabase
      .from('answers')
      .select('*, sheets(name)')
      .eq('parent_question_id', question.id)
      .in('sheet_id', productionSheetIds)

    const nullAnswers = answers?.filter(a => !a.choice_id && a.boolean_value === null) || []

    if (nullAnswers.length > 0) {
      issuesByQuestion.set(question.id, {
        question,
        nullAnswers,
        totalProductionAnswers: answers?.length || 0
      })
    }
  }

  // Step 4: Report findings
  console.log('=== Data Quality Issues Found ===\n')

  if (issuesByQuestion.size === 0) {
    console.log('✓ No issues found! All production sheets have complete radio/select answers.\n')
    return
  }

  console.log(`Found ${issuesByQuestion.size} questions with NULL answers in production sheets:\n`)

  const issuesList = Array.from(issuesByQuestion.entries())
    .sort((a, b) => b[1].nullAnswers.length - a[1].nullAnswers.length)

  issuesList.forEach(([questionId, data]) => {
    const { question, nullAnswers, totalProductionAnswers } = data
    const percentNull = ((nullAnswers.length / totalProductionAnswers) * 100).toFixed(1)

    console.log(`${question.name?.substring(0, 70)}...`)
    console.log(`  Type: ${question.question_type}`)
    console.log(`  NULL answers: ${nullAnswers.length} / ${totalProductionAnswers} (${percentNull}%)`)
    console.log(`  Affected sheets:`)
    nullAnswers.slice(0, 5).forEach((a: any) => {
      console.log(`    - ${a.sheets?.name || 'Unknown'}`)
    })
    if (nullAnswers.length > 5) {
      console.log(`    ... and ${nullAnswers.length - 5} more`)
    }
    console.log('')
  })

  // Step 5: Recommendations
  console.log('=== Recommendations ===\n')
  console.log('1. Verify if NULL values are legitimate (supplier left blank)')
  console.log('2. For critical questions, check Bubble source data')
  console.log('3. Consider implementing UI warnings for incomplete sheets')
  console.log('4. Add validation rules to require certain fields\n')

  // Step 6: Auto-fix suggestions
  console.log('=== Auto-Fix Options ===\n')
  console.log('To automatically fix NULL answers, you can:')
  console.log('1. Set default value (e.g., "No" for Yes/No questions)')
  console.log('2. Flag for manual review')
  console.log('3. Leave as-is and handle in UI with "(Not answered)" display\n')

  console.log('Current implementation: UI displays "(Not answered)" - no fix needed ✓')
}

validateAndFixProductionData().catch(console.error)
