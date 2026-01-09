import { supabase } from './src/migration/supabase-client.js'

async function estimateMigrationScope() {
  console.log('=== Estimating Answer Migration Scope ===\n')

  // Get all sheets with version > 1
  const { data: multiVersionSheets } = await supabase
    .from('sheets')
    .select('id, name, version, father_sheet_id')
    .gt('version', 1)
    .order('version')

  console.log(`Total sheets with version > 1: ${multiVersionSheets?.length || 0}`)

  // Count by version
  const byVersion = new Map<number, number>()
  multiVersionSheets?.forEach(sheet => {
    byVersion.set(sheet.version, (byVersion.get(sheet.version) || 0) + 1)
  })

  console.log('\nSheets by version:')
  Array.from(byVersion.keys()).sort().forEach(v => {
    console.log(`  Version ${v}: ${byVersion.get(v)} sheets`)
  })

  // Check how many already have answers
  console.log('\n=== Checking Existing Answers ===\n')

  let totalWithAnswers = 0
  let totalWithoutAnswers = 0

  if (multiVersionSheets) {
    for (const sheet of multiVersionSheets.slice(0, 50)) { // Sample first 50
      const { count } = await supabase
        .from('answers')
        .select('id', { count: 'exact', head: true })
        .eq('sheet_id', sheet.id)

      if (count && count > 0) {
        totalWithAnswers++
      } else {
        totalWithoutAnswers++
      }
    }

    console.log(`Sampled 50 sheets with version > 1:`)
    console.log(`  With answers: ${totalWithAnswers}`)
    console.log(`  Without answers: ${totalWithoutAnswers}`)
    console.log(`  Estimated percentage missing: ${Math.round((totalWithoutAnswers / 50) * 100)}%`)
  }

  // Estimate total work
  const totalSheets = multiVersionSheets?.length || 0
  const estimatedMissing = Math.round(totalSheets * (totalWithoutAnswers / 50))

  console.log('\n=== Scope Estimate ===\n')
  console.log(`Total sheets needing answer migration: ~${estimatedMissing}`)
  console.log(`Average answers per sheet (based on Hydrocarb): ~200`)
  console.log(`Estimated total answers to migrate: ~${estimatedMissing * 200}`)
  console.log('\nEstimated time:')
  console.log(`  At 100 answers/minute: ${Math.round((estimatedMissing * 200) / 100)} minutes`)
  console.log(`  At 500 answers/minute: ${Math.round((estimatedMissing * 200) / 500)} minutes`)
  console.log(`  At 1000 answers/minute: ${Math.round((estimatedMissing * 200) / 1000)} minutes`)

  // Reality check
  console.log('\n=== Reality Check ===')
  console.log('Actual time will depend on:')
  console.log('  - Bubble API rate limits')
  console.log('  - Network speed')
  console.log('  - Supabase batch insert speed')
  console.log('  - Whether we process in parallel')
  console.log('\nRealistic estimate: 20-60 minutes for full migration')
}

estimateMigrationScope()
