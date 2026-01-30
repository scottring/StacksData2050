import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
dotenv.config()

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function cleanup() {
  const sheetId = '1db0649e-1ac1-406b-b758-24b6c3f07833'

  console.log('Cleaning up test sheet answers in batches...')

  let deleted = 0
  let hasMore = true

  while (hasMore) {
    const { data: answers } = await supabase
      .from('answers')
      .select('id')
      .eq('sheet_id', sheetId)
      .limit(100)

    if (!answers || answers.length === 0) {
      hasMore = false
      break
    }

    const ids = answers.map(a => a.id)
    const { error } = await supabase
      .from('answers')
      .delete()
      .in('id', ids)

    if (error) {
      console.log('Error:', error.message)
      // Try one at a time
      for (const id of ids) {
        await supabase.from('answers').delete().eq('id', id)
        deleted++
      }
    } else {
      deleted += ids.length
    }

    process.stdout.write(`\rDeleted ${deleted} answers...`)
  }

  console.log(`\nDeleted ${deleted} total answers`)

  // Now clean up orphaned list_table_rows
  console.log('\nCleaning up orphaned list_table_rows...')

  const { data: listRows } = await supabase
    .from('list_table_rows')
    .select('id')

  let orphanedCount = 0
  for (const row of listRows || []) {
    const { count } = await supabase
      .from('answers')
      .select('*', { count: 'exact', head: true })
      .eq('list_table_row_id', row.id)

    if (count === 0) {
      await supabase.from('list_table_rows').delete().eq('id', row.id)
      orphanedCount++
    }
  }

  console.log(`Deleted ${orphanedCount} orphaned list_table_rows`)

  // Verify
  const { count } = await supabase
    .from('answers')
    .select('*', { count: 'exact', head: true })
    .eq('sheet_id', sheetId)

  console.log(`\nRemaining answers in test sheet: ${count}`)
}

cleanup().catch(console.error)
