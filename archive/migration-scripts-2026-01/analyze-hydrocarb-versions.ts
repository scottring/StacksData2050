import { supabase } from './src/migration/supabase-client.js'

async function analyzeHydrocarbVersions() {
  console.log('=== Searching for Hydrocarb 90-ME 78% sheets ===\n')

  // Search for sheets with this name
  const { data: sheets, error } = await supabase
    .from('sheets')
    .select('*')
    .or('name.ilike.%Hydrocarb%,name.ilike.%90-ME%,name.ilike.%90-me%')
    .order('created_at')

  if (error) {
    console.log(`Error: ${error.message}`)
    return
  }

  console.log(`Found ${sheets?.length || 0} Hydrocarb-related sheets\n`)

  if (!sheets || sheets.length === 0) {
    // Try broader search
    const { data: allSheets } = await supabase
      .from('sheets')
      .select('id, name, version, father_sheet_id, prev_sheet_id, created_at')
      .order('created_at')
      .limit(100)

    console.log('Showing first 100 sheet names for reference:')
    allSheets?.slice(0, 20).forEach(s => console.log(`  - ${s.name}`))
    return
  }

  // Group sheets by father_sheet_id to understand version chains
  const sheetGroups = new Map<string, any[]>()

  sheets.forEach(sheet => {
    const fatherId = sheet.father_sheet_id || sheet.id
    if (!sheetGroups.has(fatherId)) {
      sheetGroups.set(fatherId, [])
    }
    sheetGroups.get(fatherId)!.push(sheet)
  })

  console.log(`\n=== Found ${sheetGroups.size} version chains ===\n`)

  for (const [fatherId, versions] of sheetGroups) {
    console.log('='.repeat(80))
    console.log(`Version Chain for father_sheet_id: ${fatherId}`)
    console.log(`Total versions: ${versions.length}\n`)

    // Sort by version number
    versions.sort((a, b) => (a.version || 0) - (b.version || 0))

    versions.forEach((sheet, index) => {
      console.log(`Version ${sheet.version || 'unknown'}:`)
      console.log(`  Sheet ID: ${sheet.id}`)
      console.log(`  Name: ${sheet.name}`)
      console.log(`  Created: ${sheet.created_at}`)
      console.log(`  Modified: ${sheet.modified_at}`)
      console.log(`  Version Lock: ${sheet.version_lock}`)
      console.log(`  Version Description: ${sheet.version_description}`)
      console.log(`  Version Close Date: ${sheet.version_close_date}`)
      console.log(`  Closed By: ${sheet.version_closed_by}`)
      console.log(`  Father Sheet ID: ${sheet.father_sheet_id}`)
      console.log(`  Prev Sheet ID: ${sheet.prev_sheet_id}`)
      console.log(`  Archived: ${sheet.mark_as_archived}`)
      console.log(`  Test Sheet: ${sheet.mark_as_test_sheet}`)

      console.log()
    })
  }

  // Analyze the versioning pattern
  console.log('\n=== Versioning Pattern Analysis ===\n')
  console.log('Key Fields:')
  console.log('  - version: Version number (1, 2, 3, etc.)')
  console.log('  - version_lock: Whether this version is locked (closed)')
  console.log('  - version_description: Description of why version was created')
  console.log('  - version_close_date: When this version was closed')
  console.log('  - version_closed_by: User who closed this version')
  console.log('  - father_sheet_id: The original/parent sheet (same for all versions)')
  console.log('  - prev_sheet_id: The immediate previous version')
  console.log('  - mark_as_archived: Whether sheet is archived')
  console.log('\nPattern:')
  console.log('  - All versions of the same sheet share the same father_sheet_id')
  console.log('  - Each new version points to the previous version via prev_sheet_id')
  console.log('  - Version numbers increment: 1, 2, 3, etc.')
  console.log('  - When a version is closed, version_lock = true and version_close_date is set')
}

analyzeHydrocarbVersions()
