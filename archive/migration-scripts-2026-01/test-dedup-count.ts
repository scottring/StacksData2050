import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Load from web/.env.local
dotenv.config({ path: join(__dirname, 'web', '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

console.log('Supabase URL:', supabaseUrl ? supabaseUrl.substring(0, 30) + '...' : 'NOT SET')
console.log('Supabase Key:', supabaseKey ? supabaseKey.substring(0, 20) + '...' : 'NOT SET')

const supabase = createClient(supabaseUrl, supabaseKey)

async function testDeduplication() {
  console.log('Fetching all non-archived sheets...')

  const { data: allSheets, error } = await supabase
    .from('sheets')
    .select('id, name, modified_at, created_at, mark_as_archived')

  if (error) {
    console.error('Error:', error)
    return
  }

  console.log(`Total sheets (with duplicates): ${allSheets?.length || 0}`)

  // Deduplicate by name
  const sheetsByName = new Map<string, any>()
  allSheets?.forEach(sheet => {
    const existing = sheetsByName.get(sheet.name)
    if (!existing || new Date(sheet.modified_at || sheet.created_at || 0) > new Date(existing.modified_at || existing.created_at || 0)) {
      sheetsByName.set(sheet.name, sheet)
    }
  })

  const uniqueSheets = Array.from(sheetsByName.values())
  console.log(`Unique sheets (deduplicated by name): ${uniqueSheets.length}`)

  // Show a few examples of duplicates
  const duplicateCounts = new Map<string, number>()
  allSheets?.forEach(sheet => {
    duplicateCounts.set(sheet.name, (duplicateCounts.get(sheet.name) || 0) + 1)
  })

  const duplicates = Array.from(duplicateCounts.entries())
    .filter(([_, count]) => count > 1)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)

  console.log('\nTop 5 sheets with most versions:')
  duplicates.forEach(([name, count]) => {
    console.log(`  - "${name}": ${count} versions`)
  })
}

testDeduplication()
