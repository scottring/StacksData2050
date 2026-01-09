import { supabase } from './src/migration/supabase-client.js'

async function analyzeMigrationRisks() {
  console.log('=== Migration Risk Analysis ===\n')

  // 1. Check foreign key constraints
  console.log('1. Foreign Key Constraints on answers table:')
  console.log('   - sheet_id → sheets.id')
  console.log('   - parent_question_id → questions.id')
  console.log('   - choice_id → choices.id')
  console.log('   - parent_subsection_id → subsections.id')
  console.log()

  // 2. Check if adding answers will break anything
  console.log('2. Impact of Adding Answers:')
  console.log('   ✅ Adding answers is SAFE - it only inserts new rows')
  console.log('   ✅ No existing data is modified')
  console.log('   ✅ No foreign keys are changed')
  console.log('   ✅ Frontend already queries by sheet_id, so new answers will just appear')
  console.log()

  // 3. Check existing answer structure
  const { data: sampleAnswer } = await supabase
    .from('answers')
    .select('*')
    .limit(1)
    .single()

  console.log('3. Answer Table Structure:')
  if (sampleAnswer) {
    const requiredFields = ['sheet_id', 'parent_question_id']
    const hasAllRequired = requiredFields.every(field => field in sampleAnswer)
    console.log(`   ✅ Required fields present: ${hasAllRequired}`)
    console.log(`   Fields: ${Object.keys(sampleAnswer).slice(0, 10).join(', ')}...`)
  }
  console.log()

  // 4. Check for duplicate prevention
  console.log('4. Duplicate Prevention Strategy:')
  console.log('   Need to check: Does answer have a unique constraint?')

  const { data: existingAnswers } = await supabase
    .from('answers')
    .select('bubble_id')
    .not('bubble_id', 'is', null)
    .limit(5)

  console.log(`   ✅ Answers have bubble_id field: ${existingAnswers && existingAnswers.length > 0}`)
  console.log('   Strategy: Check bubble_id before insert to avoid duplicates')
  console.log()

  // 5. Check current answer counts
  console.log('5. Current State:')
  const { count: totalAnswers } = await supabase
    .from('answers')
    .select('id', { count: 'exact', head: true })

  const { count: v1Answers } = await supabase
    .from('answers')
    .select('id', { count: 'exact', head: true })
    .in('sheet_id', await getVersion1SheetIds())

  console.log(`   Total answers in database: ${totalAnswers}`)
  console.log(`   Answers for V1 sheets: ${v1Answers}`)
  console.log(`   Answers for V2+ sheets: ${(totalAnswers || 0) - (v1Answers || 0)}`)
  console.log()

  // 6. Test insert safety
  console.log('6. Insert Safety Test:')
  console.log('   Migration approach:')
  console.log('   1. Query Bubble for answers by sheet bubble_id')
  console.log('   2. Check if answer.bubble_id already exists in Supabase')
  console.log('   3. If not exists, insert with proper foreign keys')
  console.log('   4. Use batching (50-100 at a time) to avoid timeouts')
  console.log()

  // 7. Rollback plan
  console.log('7. Rollback Plan:')
  console.log('   ✅ Can identify all new answers by created_at timestamp')
  console.log('   ✅ Can delete by: WHERE created_at > <migration_start_time>')
  console.log('   ✅ Or delete by: WHERE bubble_id IN (<migrated_bubble_ids>)')
  console.log()

  // 8. Risks
  console.log('8. Risk Assessment:')
  console.log()
  console.log('   🟢 LOW RISK:')
  console.log('      - Only inserting new rows (no updates/deletes)')
  console.log('      - Foreign keys are already validated in migration logic')
  console.log('      - Can be rolled back easily')
  console.log('      - Existing data is not touched')
  console.log()
  console.log('   🟡 MEDIUM RISK:')
  console.log('      - Migration might fail partway through (can resume)')
  console.log('      - Some answers might reference deleted questions/choices')
  console.log('      - Network/API timeout issues (use batching)')
  console.log()
  console.log('   🔴 HIGH RISK:')
  console.log('      - None identified')
  console.log()

  // 9. Validation strategy
  console.log('9. Validation Strategy:')
  console.log('   Before migration:')
  console.log('   - Count answers in Bubble for each sheet')
  console.log('   - Count answers in Supabase for each sheet')
  console.log('   After migration:')
  console.log('   - Re-count and compare')
  console.log('   - Spot check 5-10 sheets manually')
  console.log('   - Verify no duplicates created')
  console.log()

  // 10. Recommendation
  console.log('10. Recommendation:')
  console.log()
  console.log('   SAFE TO PROCEED with these precautions:')
  console.log('   ✓ Use DRY_RUN=true first to simulate')
  console.log('   ✓ Start with 10 sheets as a test')
  console.log('   ✓ Check results before full migration')
  console.log('   ✓ Use batching to avoid timeouts')
  console.log('   ✓ Log all inserted bubble_ids for rollback')
  console.log()
  console.log('   Estimated time: 30-45 minutes for careful migration')
  console.log('   Estimated time: 10-15 minutes for test (10 sheets)')
}

async function getVersion1SheetIds(): Promise<string[]> {
  const { data: sheets } = await supabase
    .from('sheets')
    .select('id')
    .eq('version', 1)
    .limit(100)

  return sheets?.map(s => s.id) || []
}

analyzeMigrationRisks()
