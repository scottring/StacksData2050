import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
dotenv.config()

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const sheetId = '1db0649e-1ac1-406b-b758-24b6c3f07833'

async function cleanup() {
  console.log('Fast cleanup using single-record deletes...\n')

  let totalDeleted = 0

  // Delete one at a time but very fast
  while (true) {
    const { data: answers } = await supabase
      .from('answers')
      .select('id')
      .eq('sheet_id', sheetId)
      .limit(50)

    if (!answers || answers.length === 0) break

    // Delete individually (more reliable, avoids timeout)
    for (const a of answers) {
      await supabase.from('answers').delete().eq('id', a.id)
      totalDeleted++
    }

    process.stdout.write(`\rDeleted ${totalDeleted}...`)
  }

  console.log(`\n\nTotal deleted: ${totalDeleted}`)

  // Clean up orphaned list_table_rows
  console.log('Cleaning up list_table_rows...')

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
}

cleanup().catch(console.error)
