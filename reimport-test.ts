import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
dotenv.config()

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const sheetId = '0e21cabb-84f4-43a6-8e77-614e9941a734'

async function deleteAndPrepare() {
  console.log('=== PREPARING FOR RE-IMPORT ===\n')

  // Get count before
  const { count: before } = await supabase
    .from('answers')
    .select('*', { count: 'exact', head: true })
    .eq('sheet_id', sheetId)

  console.log(`Current answers in test sheet: ${before}`)

  // Delete in batches
  console.log('Deleting answers...')
  let deleted = 0

  while (true) {
    const { data: batch } = await supabase
      .from('answers')
      .select('id')
      .eq('sheet_id', sheetId)
      .limit(100)

    if (!batch || batch.length === 0) break

    const ids = batch.map(a => a.id)
    await supabase.from('answers').delete().in('id', ids)
    deleted += ids.length
    process.stdout.write(`\rDeleted ${deleted}...`)
  }

  console.log(`\nDeleted ${deleted} answers`)

  // Clean up orphaned list_table_rows
  console.log('\nCleaning up list_table_rows...')
  const { data: listRows } = await supabase
    .from('list_table_rows')
    .select('id')

  let orphaned = 0
  for (const row of listRows || []) {
    const { count } = await supabase
      .from('answers')
      .select('*', { count: 'exact', head: true })
      .eq('list_table_row_id', row.id)

    if (count === 0) {
      await supabase.from('list_table_rows').delete().eq('id', row.id)
      orphaned++
    }
  }

  console.log(`Cleaned up ${orphaned} orphaned list_table_rows`)

  // Verify
  const { count: after } = await supabase
    .from('answers')
    .select('*', { count: 'exact', head: true })
    .eq('sheet_id', sheetId)

  console.log(`\nAnswers remaining: ${after}`)
  console.log('\nReady for re-import!')
}

deleteAndPrepare().catch(console.error)
