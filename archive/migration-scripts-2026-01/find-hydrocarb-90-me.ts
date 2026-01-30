import { supabase } from './src/migration/supabase-client.js'

async function findHydrocarb90ME() {
  console.log('=== Searching for Hydrocarb 90-ME 78% ===\n')

  // Search with exact name match variations
  const searchPatterns = [
    '%90-ME 78%',
    '%90-me 78%',
    '%90ME78%',
    '%90 ME%',
  ]

  for (const pattern of searchPatterns) {
    const { data: sheets } = await supabase
      .from('sheets')
      .select('*')
      .ilike('name', pattern)
      .order('version')

    if (sheets && sheets.length > 0) {
      console.log(`Found ${sheets.length} sheets matching "${pattern}":\n`)

      // Group by father_sheet_id
      const byFather = new Map<string, any[]>()
      sheets.forEach(sheet => {
        const fatherId = sheet.father_sheet_id || sheet.id
        if (!byFather.has(fatherId)) {
          byFather.set(fatherId, [])
        }
        byFather.get(fatherId)!.push(sheet)
      })

      for (const [fatherId, versions] of byFather) {
        console.log('='.repeat(80))
        console.log(`Product: ${versions[0].name}`)
        console.log(`Father Sheet ID: ${fatherId}`)
        console.log(`Total Versions: ${versions.length}\n`)

        versions.sort((a, b) => (a.version || 0) - (b.version || 0))

        for (const sheet of versions) {
          console.log(`Version ${sheet.version}:`)
          console.log(`  Sheet ID: ${sheet.id}`)
          console.log(`  Bubble ID: ${sheet.bubble_id}`)
          console.log(`  Created: ${sheet.created_at}`)
          console.log(`  Modified: ${sheet.modified_at}`)
          console.log(`  Version Lock: ${sheet.version_lock}`)
          console.log(`  Version Close Date: ${sheet.version_close_date}`)
          console.log(`  Closed By: ${sheet.version_closed_by}`)
          console.log(`  Description: ${sheet.version_description}`)
          console.log(`  Prev Sheet ID: ${sheet.prev_sheet_id}`)
          console.log(`  Archived: ${sheet.mark_as_archived}`)

          // Count answers for this version
          const { count } = await supabase
            .from('answers')
            .select('id', { count: 'exact', head: true })
            .eq('parent_sheet_id', sheet.id)

          console.log(`  Answers: ${count || 0}`)

          // Get some sample answer timestamps to see when they were entered
          const { data: sampleAnswers } = await supabase
            .from('answers')
            .select('created_at, modified_at')
            .eq('parent_sheet_id', sheet.id)
            .order('created_at')
            .limit(5)

          if (sampleAnswers && sampleAnswers.length > 0) {
            console.log(`  Answer timestamps:`)
            console.log(`    Earliest: ${sampleAnswers[0].created_at}`)
            console.log(`    Latest modified: ${sampleAnswers[sampleAnswers.length - 1].modified_at}`)
          }

          console.log()
        }
      }

      return // Found it, stop searching
    }
  }

  console.log('No sheets found with those patterns. Showing sheets with "90" and "ME"...')

  const { data: broadSearch } = await supabase
    .from('sheets')
    .select('id, name, version, created_at')
    .ilike('name', '%90%')
    .order('name')
    .limit(50)

  console.log('\nSheets containing "90":')
  broadSearch?.filter(s => s.name.toLowerCase().includes('me')).forEach(s => {
    console.log(`  - ${s.name} (v${s.version})`)
  })
}

findHydrocarb90ME()
