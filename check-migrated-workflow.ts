import { supabase } from './src/migration/supabase-client.js'

async function checkMigratedWorkflow() {
  const { count: commentCount } = await supabase
    .from('comments')
    .select('*', { count: 'exact', head: true })

  const { count: rejectionCount } = await supabase
    .from('answer_rejections')
    .select('*', { count: 'exact', head: true })

  console.log('Workflow Migration Status:')
  console.log(`  Comments migrated: ${commentCount}`)
  console.log(`  Answer rejections migrated: ${rejectionCount}`)
  console.log()
  console.log(`Expected from Bubble:`)
  console.log(`  Comments: 2,741`)
  console.log(`  Answer rejections: 148`)
}

checkMigratedWorkflow().catch(console.error)
