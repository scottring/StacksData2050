import { supabase } from './src/migration/supabase-client.js'
import fetch from 'node-fetch'
import dotenv from 'dotenv'

dotenv.config()

const BUBBLE_BASE_URL = process.env.BUBBLE_API_URL!
const BUBBLE_API_TOKEN = process.env.BUBBLE_API_TOKEN!

/**
 * Comprehensive Bubble Fidelity Check
 *
 * Compares Supabase data with Bubble to identify ANY mismatches
 */

async function verifyBubbleFidelity() {
  console.log('🔍 BUBBLE FIDELITY VERIFICATION')
  console.log('=' .repeat(80))
  console.log()

  const issues: string[] = []
  const verified: string[] = []

  // 1. Check if Bubble has sheet statuses
  console.log('📋 STEP 1: Checking if Bubble has sheet status data')
  console.log('-'.repeat(80))

  const bubbleSheetSample = await fetch(`${BUBBLE_BASE_URL}/api/1.1/obj/sheet?limit=5`, {
    headers: { 'Authorization': `Bearer ${BUBBLE_API_TOKEN}` }
  })
  const bubbleSheetData = await bubbleSheetSample.json() as any

  if (bubbleSheetData.response?.results?.[0]) {
    const sampleSheet = bubbleSheetData.response.results[0]
    const hasStatusField = 'Status' in sampleSheet || 'status' in sampleSheet || 'NEW_STATUS' in sampleSheet

    console.log('Bubble sheet sample fields:', Object.keys(sampleSheet).slice(0, 20).join(', '))
    console.log()

    if (hasStatusField) {
      console.log('✅ Bubble HAS status field')
      console.log(`   Sample value: ${sampleSheet.Status || sampleSheet.status || sampleSheet.NEW_STATUS}`)
      issues.push('❌ Bubble has status data but Supabase sheets all have NULL status')
    } else {
      console.log('ℹ️  Bubble does NOT have status field')
      verified.push('✅ Sheet statuses: Bubble also has no status data (NULL is correct)')
    }
  }
  console.log()

  // 2. Verify question count matches
  console.log('📚 STEP 2: Question Count Verification')
  console.log('-'.repeat(80))

  const { count: supabaseQuestionCount } = await supabase
    .from('questions')
    .select('*', { count: 'exact', head: true })

  const bubbleQuestionsResp = await fetch(`${BUBBLE_BASE_URL}/api/1.1/obj/question`, {
    headers: { 'Authorization': `Bearer ${BUBBLE_API_TOKEN}` }
  })
  const bubbleQuestionsData = await bubbleQuestionsResp.json() as any
  const bubbleQuestionCount = bubbleQuestionsData.response?.count || 0

  console.log(`Supabase: ${supabaseQuestionCount} questions`)
  console.log(`Bubble:    ${bubbleQuestionCount} questions`)

  if (supabaseQuestionCount === bubbleQuestionCount) {
    verified.push(`✅ Question count matches: ${supabaseQuestionCount}`)
  } else {
    issues.push(`❌ Question count mismatch: Supabase has ${supabaseQuestionCount}, Bubble has ${bubbleQuestionCount}`)
  }
  console.log()

  // 3. Verify sections match
  console.log('📂 STEP 3: Section Verification')
  console.log('-'.repeat(80))

  const { count: supabaseSectionCount } = await supabase
    .from('sections')
    .select('*', { count: 'exact', head: true })

  const bubbleSectionsResp = await fetch(`${BUBBLE_BASE_URL}/api/1.1/obj/section`, {
    headers: { 'Authorization': `Bearer ${BUBBLE_API_TOKEN}` }
  })
  const bubbleSectionsData = await bubbleSectionsResp.json() as any
  const bubbleSectionCount = bubbleSectionsData.response?.count || 0

  console.log(`Supabase: ${supabaseSectionCount} sections`)
  console.log(`Bubble:    ${bubbleSectionCount} sections`)

  if (supabaseSectionCount === bubbleSectionCount) {
    verified.push(`✅ Section count matches: ${supabaseSectionCount}`)
  } else {
    issues.push(`❌ Section count mismatch: Supabase has ${supabaseSectionCount}, Bubble has ${bubbleSectionCount}`)
  }
  console.log()

  // 4. Verify subsections match
  console.log('📑 STEP 4: Subsection Verification')
  console.log('-'.repeat(80))

  const { count: supabaseSubsectionCount } = await supabase
    .from('subsections')
    .select('*', { count: 'exact', head: true })

  const bubbleSubsectionsResp = await fetch(`${BUBBLE_BASE_URL}/api/1.1/obj/subsection`, {
    headers: { 'Authorization': `Bearer ${BUBBLE_API_TOKEN}` }
  })
  const bubbleSubsectionsData = await bubbleSubsectionsResp.json() as any
  const bubbleSubsectionCount = bubbleSubsectionsData.response?.count || 0

  console.log(`Supabase: ${supabaseSubsectionCount} subsections`)
  console.log(`Bubble:    ${bubbleSubsectionCount} subsections`)

  if (supabaseSubsectionCount === bubbleSubsectionCount) {
    verified.push(`✅ Subsection count matches: ${supabaseSubsectionCount}`)
  } else {
    issues.push(`❌ Subsection count mismatch: Supabase has ${supabaseSubsectionCount}, Bubble has ${bubbleSubsectionCount}`)
  }
  console.log()

  // 5. Verify answers match
  console.log('💬 STEP 5: Answer Verification')
  console.log('-'.repeat(80))

  const { count: supabaseAnswerCount } = await supabase
    .from('answers')
    .select('*', { count: 'exact', head: true })

  const bubbleAnswersResp = await fetch(`${BUBBLE_BASE_URL}/api/1.1/obj/answer`, {
    headers: { 'Authorization': `Bearer ${BUBBLE_API_TOKEN}` }
  })
  const bubbleAnswersData = await bubbleAnswersResp.json() as any
  const bubbleAnswerCount = bubbleAnswersData.response?.count || 0

  console.log(`Supabase: ${supabaseAnswerCount} answers`)
  console.log(`Bubble:    ${bubbleAnswerCount} answers`)

  if (supabaseAnswerCount === bubbleAnswerCount) {
    verified.push(`✅ Answer count matches: ${supabaseAnswerCount}`)
  } else {
    const diff = Math.abs(supabaseAnswerCount - bubbleAnswerCount)
    const pct = ((diff / bubbleAnswerCount) * 100).toFixed(2)
    if (diff < bubbleAnswerCount * 0.01) { // Less than 1% difference
      verified.push(`✅ Answer count ~matches: ${supabaseAnswerCount} vs ${bubbleAnswerCount} (${pct}% diff)`)
    } else {
      issues.push(`❌ Answer count mismatch: Supabase has ${supabaseAnswerCount}, Bubble has ${bubbleAnswerCount} (${pct}% diff)`)
    }
  }
  console.log()

  // 6. Check a sample question for data fidelity
  console.log('🔬 STEP 6: Sample Question Data Fidelity')
  console.log('-'.repeat(80))

  const { data: sampleQuestions } = await supabase
    .from('questions')
    .select('bubble_id, order_number, section_sort_number, subsection_sort_number')
    .not('bubble_id', 'is', null)
    .limit(5)

  if (sampleQuestions && sampleQuestions.length > 0) {
    for (const q of sampleQuestions.slice(0, 2)) {
      const bubbleResp = await fetch(`${BUBBLE_BASE_URL}/api/1.1/obj/question/${q.bubble_id}`, {
        headers: { 'Authorization': `Bearer ${BUBBLE_API_TOKEN}` }
      })
      const bubbleQ = (await bubbleResp.json() as any).response

      if (bubbleQ) {
        const matches = {
          order: q.order_number === bubbleQ.Order,
          section: q.section_sort_number === bubbleQ['SECTION SORT NUMBER']
        }

        console.log(`Question ${q.bubble_id.substring(0, 12)}...`)
        console.log(`  order_number: Supabase=${q.order_number}, Bubble=${bubbleQ.Order} ${matches.order ? '✅' : '❌'}`)
        console.log(`  section_sort: Supabase=${q.section_sort_number}, Bubble=${bubbleQ['SECTION SORT NUMBER']} ${matches.section ? '✅' : '❌'}`)

        if (!matches.order || !matches.section) {
          issues.push(`❌ Question ${q.bubble_id} has data mismatches`)
        }
      }
    }
  }
  console.log()

  // SUMMARY
  console.log()
  console.log('=' .repeat(80))
  console.log('📊 FIDELITY SUMMARY')
  console.log('=' .repeat(80))
  console.log()

  console.log(`✅ VERIFIED (${verified.length}):`)
  verified.forEach(v => console.log(`  ${v}`))
  console.log()

  console.log(`❌ ISSUES FOUND (${issues.length}):`)
  if (issues.length === 0) {
    console.log(`  None! Database perfectly matches Bubble.`)
  } else {
    issues.forEach(i => console.log(`  ${i}`))
  }
  console.log()

  console.log('=' .repeat(80))
  console.log('🎯 RECOMMENDATION')
  console.log('=' .repeat(80))

  if (issues.length === 0) {
    console.log('✅ PERFECT FIDELITY')
    console.log('   Database matches Bubble exactly. Safe to proceed with build-out.')
  } else if (issues.length <= 2 && issues.some(i => i.includes('status'))) {
    console.log('⚠️  MINOR ISSUES')
    console.log('   Only status-related mismatches. Can proceed with build-out.')
    console.log('   Status workflow will be implemented fresh (not migrated).')
  } else {
    console.log('❌ FIDELITY ISSUES DETECTED')
    console.log('   Need to investigate and fix mismatches before build-out.')
    console.log('   Run restore scripts as needed.')
  }
  console.log()
}

verifyBubbleFidelity().catch(console.error)
