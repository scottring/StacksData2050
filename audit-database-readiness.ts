import { supabase } from './src/migration/supabase-client.js'

/**
 * Database Readiness Audit
 *
 * Checks if the database is ready for building the core workflow
 */

async function auditDatabase() {
  console.log('🔍 DATABASE READINESS AUDIT')
  console.log('=' .repeat(80))
  console.log()

  const results = {
    critical_issues: [] as string[],
    warnings: [] as string[],
    ready: [] as string[]
  }

  // 1. Check core tables exist and have data
  console.log('📊 STEP 1: Core Tables & Data')
  console.log('-'.repeat(80))

  const coreTables = [
    'companies',
    'users',
    'sheets',
    'questions',
    'answers',
    'sections',
    'subsections',
    'choices',
    'tags',
    'stacks',
    'associations'
  ]

  for (const table of coreTables) {
    const { count, error } = await supabase
      .from(table)
      .select('*', { count: 'exact', head: true })

    if (error) {
      results.critical_issues.push(`❌ Table '${table}' error: ${error.message}`)
      console.log(`  ❌ ${table}: ERROR - ${error.message}`)
    } else if (count === 0) {
      results.warnings.push(`⚠️  Table '${table}' is empty`)
      console.log(`  ⚠️  ${table}: EMPTY`)
    } else {
      results.ready.push(`✅ ${table}: ${count} rows`)
      console.log(`  ✅ ${table}: ${count} rows`)
    }
  }
  console.log()

  // 2. Check sheets.new_status column
  console.log('📋 STEP 2: Sheet Status Column')
  console.log('-'.repeat(80))

  const { data: sheetSample, error: sheetError } = await supabase
    .from('sheets')
    .select('id, new_status, created_at, modified_at')
    .limit(10)

  if (sheetError) {
    results.critical_issues.push(`❌ Cannot read sheets.new_status: ${sheetError.message}`)
    console.log(`  ❌ Cannot read sheets.new_status: ${sheetError.message}`)
  } else {
    const nullCount = sheetSample?.filter(s => s.new_status === null).length || 0
    const withStatus = sheetSample?.filter(s => s.new_status !== null).length || 0

    console.log(`  Sample of 10 sheets:`)
    console.log(`    - ${nullCount} have NULL status`)
    console.log(`    - ${withStatus} have a status value`)

    if (nullCount === 10) {
      results.critical_issues.push('❌ All sheets have NULL status - needs backfill')
      console.log(`  ❌ CRITICAL: All sheets have NULL status`)
    } else if (nullCount > 0) {
      results.warnings.push(`⚠️  Some sheets (${nullCount}/10 in sample) have NULL status`)
      console.log(`  ⚠️  WARNING: Some sheets have NULL status`)
    } else {
      results.ready.push('✅ sheets.new_status populated')
      console.log(`  ✅ All sheets have status values`)
    }

    console.log(`  Sample data:`)
    sheetSample?.slice(0, 3).forEach(s => {
      console.log(`    - ${s.id.substring(0, 8)}: status=${s.new_status}, modified=${s.modified_at?.substring(0, 10)}`)
    })
  }
  console.log()

  // 3. Check for workflow tables
  console.log('🔄 STEP 3: Workflow Tables (Status, Reviews, Comments)')
  console.log('-'.repeat(80))

  const workflowTables = [
    'sheet_status_history',
    'answer_rejections',
    'comments'
  ]

  for (const table of workflowTables) {
    const { count, error } = await supabase
      .from(table)
      .select('*', { count: 'exact', head: true })

    if (error) {
      if (error.message.includes('does not exist') || error.code === '42P01') {
        results.critical_issues.push(`❌ Table '${table}' does not exist - needs migration`)
        console.log(`  ❌ ${table}: MISSING (needs creation)`)
      } else {
        results.critical_issues.push(`❌ Table '${table}' error: ${error.message}`)
        console.log(`  ❌ ${table}: ERROR - ${error.message}`)
      }
    } else {
      results.ready.push(`✅ ${table} exists (${count} rows)`)
      console.log(`  ✅ ${table}: EXISTS (${count} rows)`)
    }
  }
  console.log()

  // 4. Check customer-supplier relationships
  console.log('🔗 STEP 4: Customer-Supplier Relationships')
  console.log('-'.repeat(80))

  const { data: relationshipCheck } = await supabase
    .from('sheets')
    .select('id, company_id, assigned_to_company_id')
    .limit(100)

  if (relationshipCheck) {
    const selfAssigned = relationshipCheck.filter(s =>
      s.company_id === s.assigned_to_company_id
    ).length
    const properlyAssigned = relationshipCheck.filter(s =>
      s.company_id !== s.assigned_to_company_id
    ).length
    const nullAssignments = relationshipCheck.filter(s =>
      !s.company_id || !s.assigned_to_company_id
    ).length

    console.log(`  Sample of 100 sheets:`)
    console.log(`    - ${selfAssigned} self-assigned (customer = supplier)`)
    console.log(`    - ${properlyAssigned} properly assigned (customer ≠ supplier)`)
    console.log(`    - ${nullAssignments} with NULL assignments`)

    if (selfAssigned > 50) {
      results.critical_issues.push('❌ Most sheets are self-assigned - data quality issue')
      console.log(`  ❌ CRITICAL: Majority are self-assigned`)
    } else if (selfAssigned > 0) {
      results.warnings.push(`⚠️  ${selfAssigned}/100 sheets are self-assigned`)
      console.log(`  ⚠️  Some sheets are self-assigned`)
    } else {
      results.ready.push('✅ Customer-supplier relationships look good')
      console.log(`  ✅ Relationships look good`)
    }
  }
  console.log()

  // 5. Check answers have parent relationships
  console.log('📝 STEP 5: Answer Data Integrity')
  console.log('-'.repeat(80))

  const { data: answerCheck } = await supabase
    .from('answers')
    .select('id, parent_sheet_id, parent_question_id, company_id')
    .limit(100)

  if (answerCheck) {
    const orphanedAnswers = answerCheck.filter(a =>
      !a.parent_sheet_id || !a.parent_question_id
    ).length
    const missingCompany = answerCheck.filter(a => !a.company_id).length

    console.log(`  Sample of 100 answers:`)
    console.log(`    - ${orphanedAnswers} missing parent_sheet_id or parent_question_id`)
    console.log(`    - ${missingCompany} missing company_id`)
    console.log(`    - ${100 - orphanedAnswers - missingCompany} have all required relationships`)

    if (orphanedAnswers > 10) {
      results.critical_issues.push('❌ Many answers missing parent relationships')
      console.log(`  ❌ CRITICAL: Many orphaned answers`)
    } else if (orphanedAnswers > 0) {
      results.warnings.push(`⚠️  ${orphanedAnswers}/100 answers missing relationships`)
      console.log(`  ⚠️  Some orphaned answers`)
    } else {
      results.ready.push('✅ Answer relationships intact')
      console.log(`  ✅ Answer relationships look good`)
    }
  }
  console.log()

  // 6. Check questions have proper hierarchy
  console.log('📚 STEP 6: Question Hierarchy')
  console.log('-'.repeat(80))

  const { data: questionCheck } = await supabase
    .from('questions')
    .select('id, parent_subsection_id, section_sort_number, subsection_sort_number, order_number')
    .limit(50)

  if (questionCheck) {
    const missingHierarchy = questionCheck.filter(q =>
      !q.parent_subsection_id ||
      q.section_sort_number === null ||
      q.subsection_sort_number === null ||
      q.order_number === null
    ).length

    console.log(`  Sample of 50 questions:`)
    console.log(`    - ${missingHierarchy} missing hierarchy data`)
    console.log(`    - ${50 - missingHierarchy} have complete hierarchy`)

    if (missingHierarchy > 10) {
      results.critical_issues.push('❌ Many questions missing hierarchy')
      console.log(`  ❌ CRITICAL: Many questions missing hierarchy`)
    } else if (missingHierarchy > 0) {
      results.warnings.push(`⚠️  ${missingHierarchy}/50 questions missing hierarchy`)
      console.log(`  ⚠️  Some questions missing hierarchy`)
    } else {
      results.ready.push('✅ Question hierarchy intact')
      console.log(`  ✅ Question hierarchy looks good`)
    }

    // Show sample
    console.log(`  Sample question hierarchy:`)
    questionCheck?.slice(0, 3).forEach(q => {
      console.log(`    - ${q.section_sort_number}.${q.subsection_sort_number}.${q.order_number} (subsection: ${q.parent_subsection_id?.substring(0, 8)})`)
    })
  }
  console.log()

  // 7. Check users have companies
  console.log('👥 STEP 7: User-Company Associations')
  console.log('-'.repeat(80))

  const { data: userCheck } = await supabase
    .from('users')
    .select('id, company_id, email')
    .limit(50)

  if (userCheck) {
    const orphanedUsers = userCheck.filter(u => !u.company_id).length

    console.log(`  Sample of 50 users:`)
    console.log(`    - ${orphanedUsers} without company_id`)
    console.log(`    - ${50 - orphanedUsers} assigned to companies`)

    if (orphanedUsers > 10) {
      results.critical_issues.push('❌ Many users not assigned to companies')
      console.log(`  ❌ CRITICAL: Many users without companies`)
    } else if (orphanedUsers > 0) {
      results.warnings.push(`⚠️  ${orphanedUsers}/50 users without companies`)
      console.log(`  ⚠️  Some users without companies`)
    } else {
      results.ready.push('✅ Users properly associated with companies')
      console.log(`  ✅ User-company associations look good`)
    }
  }
  console.log()

  // SUMMARY
  console.log()
  console.log('=' .repeat(80))
  console.log('📊 AUDIT SUMMARY')
  console.log('=' .repeat(80))
  console.log()

  console.log(`🚨 CRITICAL ISSUES (${results.critical_issues.length}):`)
  if (results.critical_issues.length === 0) {
    console.log(`  ✅ None!`)
  } else {
    results.critical_issues.forEach(issue => console.log(`  ${issue}`))
  }
  console.log()

  console.log(`⚠️  WARNINGS (${results.warnings.length}):`)
  if (results.warnings.length === 0) {
    console.log(`  ✅ None!`)
  } else {
    results.warnings.forEach(warning => console.log(`  ${warning}`))
  }
  console.log()

  console.log(`✅ READY (${results.ready.length}):`)
  results.ready.forEach(item => console.log(`  ${item}`))
  console.log()

  console.log('=' .repeat(80))
  console.log('🎯 RECOMMENDATION')
  console.log('=' .repeat(80))

  if (results.critical_issues.length === 0 && results.warnings.length === 0) {
    console.log(`✅ DATABASE IS READY FOR BUILD OUT!`)
    console.log(`   You can proceed with implementing the core workflow.`)
  } else if (results.critical_issues.length > 0) {
    console.log(`❌ DATABASE NEEDS FIXES BEFORE BUILD OUT`)
    console.log(`   Address critical issues first:`)
    results.critical_issues.forEach((issue, i) => {
      console.log(`   ${i + 1}. ${issue}`)
    })
  } else {
    console.log(`⚠️  DATABASE HAS WARNINGS BUT MAY BE READY`)
    console.log(`   Consider addressing warnings, or proceed with caution.`)
  }
  console.log()
}

auditDatabase().catch(console.error)
