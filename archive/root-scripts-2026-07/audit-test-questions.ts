import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
dotenv.config()

const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
)

// Patterns that indicate test/dummy questions
const TEST_PATTERNS = [
  // User mentioned these
  /is it snowing/i,
  /is it dark/i,
  /dark already/i,

  // Previous cleanup patterns
  /test question/i,
  /is scott from/i,
  /heather, can you see/i,
  /^Question #\s*\d+$/,

  // Generic test patterns
  /^test$/i,
  /^test\s+\d+$/i,
  /lorem ipsum/i,
  /asdf/i,
  /hello world/i,
  /foo bar/i,
  /sample question/i,
  /example question/i,
  /dummy/i,
  /placeholder/i,
  /delete me/i,
  /remove me/i,
]

async function audit() {
  console.log('=== AUDIT TEST/DUMMY QUESTIONS ===\n')

  // Get questions with section/subsection info via joins
  const { data: questions, error } = await supabase
    .from('questions')
    .select(`
      id,
      bubble_id,
      name,
      content,
      response_type,
      order_number,
      section_sort_number,
      subsection_sort_number,
      created_at,
      subsection_id,
      subsections (
        id,
        name,
        sections (
          id,
          name
        )
      )
    `)
    .order('section_sort_number')
    .order('subsection_sort_number')
    .order('order_number')

  if (error) {
    console.error('Error fetching questions:', error)
    return
  }

  console.log(`Total questions in database: ${questions?.length}\n`)

  // Categorize suspicious questions
  type QuestionWithJoins = typeof questions[0]
  const suspicious: {
    category: string
    questions: QuestionWithJoins[]
  }[] = []

  const allSuspicious = new Set<string>()

  // 1. Pattern matches
  const patternMatches = questions?.filter(q => {
    const name = q.name || ''
    const content = q.content || ''
    return TEST_PATTERNS.some(pattern => pattern.test(name) || pattern.test(content))
  }) || []

  patternMatches.forEach(q => allSuspicious.add(q.id))

  if (patternMatches.length > 0) {
    suspicious.push({
      category: '🔴 OBVIOUS TEST QUESTIONS (pattern match)',
      questions: patternMatches
    })
  }

  // 2. Very short names (less than 5 chars) that aren't just numbers
  const shortNames = questions?.filter(q => {
    const name = (q.name || '').trim()
    return name.length > 0 && name.length < 5 && !/^\d+\.?\d*$/.test(name)
  }) || []

  const newShortNames = shortNames.filter(q => !allSuspicious.has(q.id))
  newShortNames.forEach(q => allSuspicious.add(q.id))

  if (newShortNames.length > 0) {
    suspicious.push({
      category: '🟡 VERY SHORT QUESTION NAMES (< 5 chars)',
      questions: newShortNames
    })
  }

  // 3. Questions that look like incomplete/test entries
  const incompletePatterns = questions?.filter(q => {
    const name = (q.name || '').trim()
    // Empty names, single words that are just characters, etc.
    return (
      name === '' ||
      /^[a-z]{1,3}$/i.test(name) ||
      /^[?!.,-]+$/.test(name) ||
      name === 'undefined' ||
      name === 'null' ||
      name === 'N/A' ||
      /^new question/i.test(name)
    )
  }) || []

  const newIncomplete = incompletePatterns.filter(q => !allSuspicious.has(q.id))
  newIncomplete.forEach(q => allSuspicious.add(q.id))

  if (newIncomplete.length > 0) {
    suspicious.push({
      category: '🟠 INCOMPLETE/PLACEHOLDER QUESTIONS',
      questions: newIncomplete
    })
  }

  // 4. Questions with weird/casual content (not compliance-related)
  const casualPatterns = [
    /weather/i,
    /snowing/i,
    /raining/i,
    /sunny/i,
    /dark outside/i,
    /time is it/i,
    /what day/i,
    /favorite/i,
    /favourite/i,
    /how are you/i,
    /hello/i,
    /goodbye/i,
    /testing/i,
    /just testing/i,
    /can you see this/i,
    /does this work/i,
  ]

  const casualQuestions = questions?.filter(q => {
    const name = q.name || ''
    const content = q.content || ''
    return casualPatterns.some(pattern => pattern.test(name) || pattern.test(content))
  }) || []

  const newCasual = casualQuestions.filter(q => !allSuspicious.has(q.id))
  newCasual.forEach(q => allSuspicious.add(q.id))

  if (newCasual.length > 0) {
    suspicious.push({
      category: '🔴 CASUAL/NON-COMPLIANCE QUESTIONS',
      questions: newCasual
    })
  }

  // Print results
  console.log('='.repeat(80))

  let totalSuspicious = 0
  for (const group of suspicious) {
    if (group.questions.length === 0) continue

    console.log(`\n${group.category} (${group.questions.length} questions):`)
    console.log('-'.repeat(60))

    for (const q of group.questions) {
      const number = `${q.section_sort_number || '?'}.${q.subsection_sort_number || '?'}.${q.order_number || '?'}`
      const sectionName = (q.subsections as any)?.sections?.name || '(no section)'
      const subsectionName = (q.subsections as any)?.name || '(no subsection)'

      console.log(`  [${number}] "${q.name || '(no name)'}"`)
      if (q.content && q.content !== q.name) {
        console.log(`         Content: "${q.content.substring(0, 80)}${q.content.length > 80 ? '...' : ''}"`)
      }
      console.log(`         Section: ${sectionName} > ${subsectionName}`)
      console.log(`         ID: ${q.id}`)
      console.log('')
    }

    totalSuspicious += group.questions.length
  }

  console.log('='.repeat(80))
  console.log(`\nTOTAL SUSPICIOUS: ${totalSuspicious}`)
  console.log(`CLEAN QUESTIONS: ${(questions?.length || 0) - totalSuspicious}`)

  // Also show questions that might be edge cases - let the user decide
  console.log('\n\n=== QUESTIONS TO MANUALLY REVIEW ===')
  console.log('These might be test questions or might be legitimate:\n')

  // Get unique section names
  const sectionMap = new Map<string, number>()
  for (const q of questions || []) {
    const sectionName = (q.subsections as any)?.sections?.name || '(unknown)'
    sectionMap.set(sectionName, (sectionMap.get(sectionName) || 0) + 1)
  }

  console.log('Question count by section:')
  const sortedSections = [...sectionMap.entries()].sort((a, b) => a[1] - b[1])
  for (const [name, count] of sortedSections) {
    console.log(`  ${count} questions - ${name}`)
  }

  // Show all questions sorted for manual review
  console.log('\n\n=== ALL QUESTIONS (for full review) ===\n')
  for (const q of questions || []) {
    const number = `${q.section_sort_number || '?'}.${q.subsection_sort_number || '?'}.${q.order_number || '?'}`
    const flag = allSuspicious.has(q.id) ? '⚠️ ' : '   '
    console.log(`${flag}[${number.padEnd(10)}] ${(q.name || '').substring(0, 100)}`)
  }
}

audit().catch(console.error)
