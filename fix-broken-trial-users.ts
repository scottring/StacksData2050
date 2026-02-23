import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

// Users with activity who had working logins (from Trial Management screenshot)
const usersWithActivity = [
  'jorge.garcia@saica.com',       // 9 activities
  'tiia.aho@kemira.com',          // 4 activities
  'christian.torborg@sappi.com',  // 3 activities
  'javierm.lopez@saica.com',      // 3 activities
  'miia.harkonen@upm.com',        // 2 activities
  'abdessamad.arbaoui@omya.com',  // 1 activity
  'kalle.luomi@upm.com',          // 1 activity
  'kaisa.herranen@upm.com',       // 1 activity
  'nicole.rugen-penkalla@kemira.com', // Discovery Done
  'patricia.cebollada@saica.com', // Listed in previous audit as broken
]

async function main() {
  console.log('\n=== DIAGNOSING BROKEN TRIAL USER RECORDS ===\n')

  // 1. Get all auth users
  const { data: { users: authUsers } } = await supabase.auth.admin.listUsers()
  const authByEmail = new Map(authUsers?.map(u => [u.email?.toLowerCase(), u]) || [])

  console.log(`Total auth.users in system: ${authUsers?.length}\n`)

  // 2. Get all public.users for these emails
  const { data: publicUsers } = await supabase
    .from('users')
    .select('id, email, full_name, company_id, created_at')
    .in('email', usersWithActivity.map(e => e.toLowerCase()))

  const publicByEmail = new Map(publicUsers?.map(u => [u.email?.toLowerCase(), u]) || [])

  console.log('=== DIAGNOSIS FOR EACH USER ===\n')

  const toFix: { email: string, publicUser: any, authUser: any }[] = []
  const orphansToDelete: { email: string, publicUser: any }[] = []

  for (const email of usersWithActivity) {
    const emailLower = email.toLowerCase()
    const publicUser = publicByEmail.get(emailLower)
    const authUser = authByEmail.get(emailLower)

    console.log(`📧 ${email}`)

    if (!publicUser && !authUser) {
      console.log(`   ✓ No records - user can sign up fresh`)
    } else if (publicUser && authUser) {
      if (publicUser.id === authUser.id) {
        console.log(`   ✓ WORKING - IDs match`)
        console.log(`     ID: ${publicUser.id}`)
      } else {
        console.log(`   ❌ BROKEN - ID MISMATCH`)
        console.log(`     public.users ID: ${publicUser.id}`)
        console.log(`     auth.users ID:   ${authUser.id}`)
        console.log(`     last_sign_in: ${authUser.last_sign_in_at || 'never'}`)
        toFix.push({ email, publicUser, authUser })
      }
    } else if (publicUser && !authUser) {
      console.log(`   ❌ ORPHAN - public.users exists but no auth.users`)
      console.log(`     public.users ID: ${publicUser.id}`)
      console.log(`     This user cannot log in - delete orphan record`)
      orphansToDelete.push({ email, publicUser })
    } else if (!publicUser && authUser) {
      console.log(`   ⚠️  auth.users exists but no public.users`)
      console.log(`     auth.users ID: ${authUser.id}`)
      console.log(`     User can log in but has no profile - may need to create public.users`)
    }
    console.log()
  }

  console.log('\n=== SUMMARY ===\n')
  console.log(`Users needing ID fix (mismatch): ${toFix.length}`)
  console.log(`Orphan records to delete: ${orphansToDelete.length}`)

  if (toFix.length === 0 && orphansToDelete.length === 0) {
    console.log('\n✓ No fixes needed!')
    return
  }

  console.log('\n=== PROPOSED FIXES ===\n')

  if (toFix.length > 0) {
    console.log('Will fix ID mismatches (delete wrong public.users, create with correct ID):')
    for (const { email, publicUser, authUser } of toFix) {
      console.log(`  ${email}`)
      console.log(`    Delete: ${publicUser.id}`)
      console.log(`    Create: ${authUser.id}`)
    }
  }

  if (orphansToDelete.length > 0) {
    console.log('\nWill delete orphan records (no auth.users, so user can sign up fresh):')
    for (const { email, publicUser } of orphansToDelete) {
      console.log(`  ${email} (ID: ${publicUser.id})`)
    }
  }

  console.log('\n⚠️  Run with --apply to execute fixes\n')

  if (!process.argv.includes('--apply')) {
    return
  }

  console.log('\n=== APPLYING FIXES ===\n')

  // Fix ID mismatches
  for (const { email, publicUser, authUser } of toFix) {
    console.log(`Fixing ${email}...`)

    // Delete wrong record
    const { error: deleteError } = await supabase
      .from('users')
      .delete()
      .eq('id', publicUser.id)

    if (deleteError) {
      console.log(`  ❌ Delete failed: ${deleteError.message}`)
      continue
    }
    console.log(`  ✓ Deleted wrong record`)

    // Create correct record
    const { error: insertError } = await supabase
      .from('users')
      .insert({
        id: authUser.id,
        email: publicUser.email,
        full_name: publicUser.full_name,
        company_id: publicUser.company_id,
        role: publicUser.role || 'user',
        created_at: publicUser.created_at,
        updated_at: new Date().toISOString(),
      })

    if (insertError) {
      console.log(`  ❌ Insert failed: ${insertError.message}`)
    } else {
      console.log(`  ✓ Created correct record with ID ${authUser.id}`)
    }
  }

  // Delete orphans
  for (const { email, publicUser } of orphansToDelete) {
    console.log(`Deleting orphan for ${email}...`)

    const { error } = await supabase
      .from('users')
      .delete()
      .eq('id', publicUser.id)

    if (error) {
      console.log(`  ❌ Failed: ${error.message}`)
    } else {
      console.log(`  ✓ Deleted - user can now sign up fresh`)
    }
  }

  console.log('\n=== DONE ===\n')
}

main().catch(console.error)
