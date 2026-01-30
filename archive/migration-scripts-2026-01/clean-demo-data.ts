import { supabase } from './src/migration/supabase-client.js'

/**
 * Clean up demo data created by seed-demo-data.ts
 */

async function cleanDemoData() {
  console.log('=== Cleaning Demo Data ===\n')

  // Get all demo companies first
  const { data: demoCompanies } = await supabase
    .from('companies')
    .select('id')
    .like('bubble_id', 'demo_%')

  console.log(`Found ${demoCompanies?.length || 0} demo companies\n`)

  if (!demoCompanies || demoCompanies.length === 0) {
    console.log('No demo data to clean')
    return
  }

  const companyIds = demoCompanies.map(c => c.id)

  // Delete in reverse order of dependencies

  console.log('1. Deleting answers from demo sheets...')
  const { data: demoSheets } = await supabase
    .from('sheets')
    .select('id')
    .like('bubble_id', 'demo_%')

  if (demoSheets && demoSheets.length > 0) {
    const sheetIds = demoSheets.map(s => s.id)
    const { error: answersError } = await supabase
      .from('answers')
      .delete()
      .in('sheet_id', sheetIds)

    if (answersError) console.warn('  ⚠️  Error:', answersError.message)
    else console.log('  ✅ Done')
  }

  console.log('2. Deleting sheets...')
  const { error: sheetsError } = await supabase
    .from('sheets')
    .delete()
    .like('bubble_id', 'demo_%')

  if (sheetsError) console.warn('  ⚠️  Error:', sheetsError.message)
  else console.log('  ✅ Done')

  console.log('3. Deleting choices from demo questions...')
  const { data: demoQuestions } = await supabase
    .from('questions')
    .select('id')
    .like('bubble_id', 'demo_%')

  if (demoQuestions && demoQuestions.length > 0) {
    const questionIds = demoQuestions.map(q => q.id)
    const { error: choicesError } = await supabase
      .from('choices')
      .delete()
      .in('parent_question_id', questionIds)

    if (choicesError) console.warn('  ⚠️  Error:', choicesError.message)
    else console.log('  ✅ Done')
  }

  console.log('4. Deleting questions...')
  const { error: questionsError } = await supabase
    .from('questions')
    .delete()
    .like('bubble_id', 'demo_%')

  if (questionsError) console.warn('  ⚠️  Error:', questionsError.message)
  else console.log('  ✅ Done')

  console.log('5. Deleting subsections...')
  const { error: subsectionsError } = await supabase
    .from('subsections')
    .delete()
    .like('bubble_id', 'demo_%')

  if (subsectionsError) console.warn('  ⚠️  Error:', subsectionsError.message)
  else console.log('  ✅ Done')

  console.log('6. Deleting sections...')
  const { error: sectionsError } = await supabase
    .from('sections')
    .delete()
    .like('bubble_id', 'demo_%')

  if (sectionsError) console.warn('  ⚠️  Error:', sectionsError.message)
  else console.log('  ✅ Done')

  console.log('7. Deleting stacks...')
  const { error: stacksError } = await supabase
    .from('stacks')
    .delete()
    .like('bubble_id', 'demo_%')

  if (stacksError) console.warn('  ⚠️  Error:', stacksError.message)
  else console.log('  ✅ Done')

  console.log('8. Deleting associations...')
  const { error: associationsError } = await supabase
    .from('associations')
    .delete()
    .like('bubble_id', 'demo_%')

  if (associationsError) console.warn('  ⚠️  Error:', associationsError.message)
  else console.log('  ✅ Done')

  console.log('9. Deleting auth users...')
  const { data: demoUsers } = await supabase
    .from('users')
    .select('id, email')
    .like('bubble_id', 'demo_%')

  if (demoUsers && demoUsers.length > 0) {
    for (const user of demoUsers) {
      const { error: authError } = await supabase.auth.admin.deleteUser(user.id)
      if (authError) console.warn(`  ⚠️  Error deleting ${user.email}:`, authError.message)
      else console.log(`  ✅ Deleted auth user: ${user.email}`)
    }
  }

  console.log('10. Deleting user records...')
  const { error: usersError } = await supabase
    .from('users')
    .delete()
    .like('bubble_id', 'demo_%')

  if (usersError) console.warn('  ⚠️  Error:', usersError.message)
  else console.log('  ✅ Done')

  console.log('11. Deleting companies...')
  const { error: companiesError } = await supabase
    .from('companies')
    .delete()
    .in('id', companyIds)

  if (companiesError) console.warn('  ⚠️  Error:', companiesError.message)
  else console.log('  ✅ Done')

  console.log('\n✅ Demo data cleanup complete!')
}

cleanDemoData().catch(console.error)
