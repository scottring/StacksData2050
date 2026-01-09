import { supabase } from './src/migration/supabase-client.js'

async function checkMigrationEffectiveness() {
  console.log('=== Migration Effectiveness Analysis ===\n')

  // 1. Which V2+ sheets have answers vs which don't
  console.log('1. Analyzing V2+ sheets with/without answers...\n')

  const { data: v2PlusSheets } = await supabase
    .from('sheets')
    .select('id, name, version, bubble_id, created_at')
    .gt('version', 1)
    .order('version')
    .limit(100)

  let withAnswers = 0
  let withoutAnswers = 0
  const samplesWithout: any[] = []
  const samplesWith: any[] = []

  if (v2PlusSheets) {
    for (const sheet of v2PlusSheets) {
      const { count } = await supabase
        .from('answers')
        .select('id', { count: 'exact', head: true })
        .eq('sheet_id', sheet.id)

      if (count && count > 0) {
        withAnswers++
        if (samplesWith.length < 3) samplesWith.push({ ...sheet, answerCount: count })
      } else {
        withoutAnswers++
        if (samplesWithout.length < 3) samplesWithout.push(sheet)
      }
    }

    console.log(`Sampled 100 V2+ sheets:`)
    console.log(`  ✓ With answers: ${withAnswers} (${Math.round(withAnswers / 100 * 100)}%)`)
    console.log(`  ✗ Without answers: ${withoutAnswers} (${Math.round(withoutAnswers / 100 * 100)}%)`)
  }

  console.log('\n2. Sheets WITH answers (sample):')
  samplesWith.forEach(s => {
    console.log(`  - ${s.name} (v${s.version}) - ${s.answerCount} answers`)
    console.log(`    Created: ${s.created_at}`)
  })

  console.log('\n3. Sheets WITHOUT answers (sample):')
  samplesWithout.forEach(s => {
    console.log(`  - ${s.name} (v${s.version})`)
    console.log(`    Created: ${s.created_at}`)
    console.log(`    Bubble ID: ${s.bubble_id}`)
  })

  // 2. Check if Hydrocarb is an exception or the norm
  console.log('\n4. Is Hydrocarb pattern (V1 has answers, V2+ empty) common?\n')

  const hydrocarb90ME = {
    v1: '8a3424ae-49d9-4f8a-a4af-fda13a222b28',
    v2: '8222b70c-14dd-48ab-8ceb-e972c9d797c3',
    v3: 'fc48461e-7a18-4cb1-887e-1a3686244ef0'
  }

  // Check a few other products with multiple versions
  const { data: multiVersionProducts } = await supabase
    .from('sheets')
    .select('name, version, id')
    .in('version', [1, 2, 3])
    .order('name, version')
    .limit(30)

  // Group by product name
  const byProduct = new Map<string, any[]>()
  multiVersionProducts?.forEach(sheet => {
    if (!byProduct.has(sheet.name)) {
      byProduct.set(sheet.name, [])
    }
    byProduct.get(sheet.name)!.push(sheet)
  })

  console.log('Checking version patterns for different products:\n')

  let patternCount = { allV1Only: 0, allVersions: 0, mixed: 0 }

  for (const [name, versions] of Array.from(byProduct.entries()).slice(0, 5)) {
    if (versions.length < 2) continue

    console.log(`  ${name}:`)

    const answerCounts = await Promise.all(
      versions.map(async (v) => {
        const { count } = await supabase
          .from('answers')
          .select('id', { count: 'exact', head: true })
          .eq('sheet_id', v.id)
        return { version: v.version, count: count || 0 }
      })
    )

    answerCounts.forEach(({ version, count }) => {
      console.log(`    V${version}: ${count} answers`)
    })

    // Classify pattern
    const v1Count = answerCounts.find(a => a.version === 1)?.count || 0
    const otherCounts = answerCounts.filter(a => a.version > 1).map(a => a.count)
    const othersHaveAnswers = otherCounts.some(c => c > 0)

    if (v1Count > 0 && !othersHaveAnswers) {
      console.log(`    Pattern: ⚠️  Only V1 has answers (like Hydrocarb)`)
      patternCount.allV1Only++
    } else if (v1Count > 0 && othersHaveAnswers) {
      console.log(`    Pattern: ✓ All versions have answers`)
      patternCount.allVersions++
    } else {
      console.log(`    Pattern: ? Mixed`)
      patternCount.mixed++
    }
    console.log()
  }

  console.log('5. Pattern Summary:')
  console.log(`  Products where only V1 has answers: ${patternCount.allV1Only}`)
  console.log(`  Products where all versions have answers: ${patternCount.allVersions}`)
  console.log(`  Mixed: ${patternCount.mixed}`)

  // 3. Check if we can actually fetch the missing answers from Bubble
  console.log('\n6. Testing Bubble API for missing sheets:\n')

  if (samplesWithout.length > 0) {
    const testSheet = samplesWithout[0]
    console.log(`Testing: ${testSheet.name} (${testSheet.bubble_id})`)

    try {
      const BUBBLE_BASE_URL = process.env.BUBBLE_API_URL!
      const BUBBLE_API_TOKEN = process.env.BUBBLE_API_TOKEN!

      const response = await fetch(
        `${BUBBLE_BASE_URL}/api/1.1/obj/answer?constraints=[{"key":"Sheet","constraint_type":"equals","value":"${testSheet.bubble_id}"}]&limit=5`,
        { headers: { 'Authorization': `Bearer ${BUBBLE_API_TOKEN}` } }
      )

      const data = await response.json() as any

      if (data.response?.count) {
        console.log(`  ✓ Found ${data.response.count} answers in Bubble!`)
        console.log(`  ✓ Migration WILL BE EFFECTIVE - answers exist in Bubble`)
      } else {
        console.log(`  ✗ No answers in Bubble either`)
        console.log(`  ✗ Migration won't help - data doesn't exist`)
      }
    } catch (error) {
      console.log(`  Error checking Bubble: ${error}`)
    }
  }

  // Final assessment
  console.log('\n=== EFFECTIVENESS ASSESSMENT ===\n')

  const percentWithAnswers = Math.round(withAnswers / 100 * 100)
  const percentWithout = Math.round(withoutAnswers / 100 * 100)

  if (percentWithout > 30) {
    console.log(`✓ MIGRATION WILL BE EFFECTIVE`)
    console.log(`  ${percentWithout}% of V2+ sheets are missing answers`)
    console.log(`  Estimated ${withoutAnswers * 8} sheets need migration across all data`)
    console.log(`  This will fix significant data gaps`)
  } else {
    console.log(`? MIGRATION MAY HAVE LIMITED IMPACT`)
    console.log(`  Only ${percentWithout}% of V2+ sheets are missing answers`)
    console.log(`  Most data already migrated successfully`)
  }

  console.log('\nNext steps:')
  console.log('  1. If Bubble has the data → migrate it')
  console.log('  2. If Bubble is empty too → investigate why answers are missing')
  console.log('  3. Check if this is a Bubble workflow issue (users not filling V2+)')
}

checkMigrationEffectiveness()
