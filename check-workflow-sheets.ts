import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function checkWorkflowSheets() {
  console.log('=== Checking sheets by workflow status ===\n')

  // Find sheets by status
  const { data: drafts } = await supabase
    .from('sheets')
    .select('id, name, modified_at')
    .eq('new_status', 'draft')
    .order('modified_at', { ascending: false })
    .limit(5)

  console.log('📝 DRAFT sheets:', drafts?.length)
  drafts?.forEach((s, i) => console.log(`  ${i + 1}. ${s.name} (${s.id})`))

  const { data: inProgress } = await supabase
    .from('sheets')
    .select('id, name, modified_at')
    .eq('new_status', 'in_progress')
    .order('modified_at', { ascending: false })
    .limit(5)

  console.log('\n⏳ IN PROGRESS sheets:', inProgress?.length || 0)
  inProgress?.forEach((s, i) => console.log(`  ${i + 1}. ${s.name} (${s.id})`))

  const { data: submitted } = await supabase
    .from('sheets')
    .select('id, name, modified_at')
    .eq('new_status', 'submitted')
    .order('modified_at', { ascending: false })
    .limit(5)

  console.log('\n📤 SUBMITTED sheets:', submitted?.length || 0)
  submitted?.forEach((s, i) => console.log(`  ${i + 1}. ${s.name} (${s.id})`))

  const { data: needsRevision } = await supabase
    .from('sheets')
    .select('id, name, modified_at')
    .eq('new_status', 'needs_revision')
    .order('modified_at', { ascending: false })
    .limit(5)

  console.log('\n🔄 NEEDS REVISION sheets:', needsRevision?.length || 0)
  needsRevision?.forEach((s, i) => console.log(`  ${i + 1}. ${s.name} (${s.id})`))

  const { data: approved } = await supabase
    .from('sheets')
    .select('id, name, modified_at')
    .eq('new_status', 'approved')
    .order('modified_at', { ascending: false })
    .limit(5)

  console.log('\n✅ APPROVED sheets:', approved?.length || 0)
  approved?.forEach((s, i) => console.log(`  ${i + 1}. ${s.name} (${s.id})`))

  // Suggest changing Hydrocarb to draft for demo
  console.log('\n💡 For demo, we can change Hydrocarb 60 BE 70% to "draft" status to show full workflow')
  console.log('   ID: 12c41505-ecd4-4c2a-933a-1aaf8efd0f3a')
}

checkWorkflowSheets().catch(console.error)
