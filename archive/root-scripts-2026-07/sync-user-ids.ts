import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function main() {
  const { data: { users: authUsers } } = await supabase.auth.admin.listUsers({ perPage: 1000 })

  const authByBubbleId = new Map<string, { id: string, email: string, first_name: string, last_name: string }>()
  for (const u of authUsers || []) {
    const meta = u.user_metadata
    if (meta?.bubble_id) {
      authByBubbleId.set(meta.bubble_id, {
        id: u.id,
        email: u.email!,
        first_name: meta.first_name || '',
        last_name: meta.last_name || '',
      })
    }
  }

  const { data: dbUsers } = await supabase
    .from('users')
    .select('id, email, full_name, company_id, role, bubble_id, is_super_admin')
    .not('bubble_id', 'is', null)

  let updated = 0
  let skipped = 0
  let errors = 0

  for (const dbUser of dbUsers || []) {
    const authUser = authByBubbleId.get(dbUser.bubble_id!)
    if (!authUser || dbUser.id === authUser.id) {
      skipped++
      continue
    }

    // Already has a record with the auth ID? Skip.
    const { data: existing } = await supabase
      .from('users')
      .select('id')
      .eq('id', authUser.id)
    if (existing && existing.length > 0) {
      skipped++
      continue
    }

    const fullName = [authUser.first_name, authUser.last_name].filter(Boolean).join(' ') || dbUser.full_name
    const savedBubbleId = dbUser.bubble_id

    // Step 1: Clear bubble_id on old record (to avoid unique constraint on insert)
    await supabase
      .from('users')
      .update({ bubble_id: null })
      .eq('id', dbUser.id)

    // Step 2: Insert new record with auth ID
    const { error: insertError } = await supabase
      .from('users')
      .insert({
        id: authUser.id,
        email: authUser.email,
        full_name: fullName,
        company_id: dbUser.company_id,
        role: dbUser.role,
        bubble_id: savedBubbleId,
        is_super_admin: dbUser.is_super_admin,
      })

    if (insertError) {
      // Restore bubble_id on old record
      await supabase.from('users').update({ bubble_id: savedBubbleId }).eq('id', dbUser.id)
      console.error(`Failed to insert for ${authUser.email}:`, insertError.message)
      errors++
      continue
    }

    // Step 3: Update sheets.created_by to new ID
    await supabase
      .from('sheets')
      .update({ created_by: authUser.id })
      .eq('created_by', dbUser.id)

    // Step 4: Delete old record
    const { error: delError } = await supabase
      .from('users')
      .delete()
      .eq('id', dbUser.id)

    if (delError) {
      console.error(`Failed to delete old record for ${authUser.email}:`, delError.message)
      errors++
    } else {
      updated++
    }
  }

  console.log(`\nResults:`)
  console.log(`  Updated: ${updated}`)
  console.log(`  Skipped: ${skipped}`)
  console.log(`  Errors: ${errors}`)
}

main()
