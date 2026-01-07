import { supabase } from './src/migration/supabase-client.js'

const sheetId = '548f08be-3b2a-465f-94b4-a2279bee9819'
const bubbleContactProfileId = '1634039802123x481191206805307400'

console.log('=== INVESTIGATING CONTACT PROFILE ISSUE ===\n')

// 1. Check the sheet's contact_profile_id field
const { data: sheet } = await supabase
  .from('sheets')
  .select('contact_profile_id')
  .eq('id', sheetId)
  .single()

console.log('Sheet contact_profile_id:', sheet?.contact_profile_id)

// 2. Check if there's a contact_profiles table
try {
  const { data: contactProfile, error } = await supabase
    .from('contact_profiles')
    .select('*')
    .eq('bubble_id', bubbleContactProfileId)
    .single()

  if (error) {
    console.log('\n❌ Error querying contact_profiles:', error.message)
  } else {
    console.log('\n✅ Found contact profile:')
    console.log(`   ID: ${contactProfile.id}`)
    console.log(`   Bubble ID: ${contactProfile.bubble_id}`)
  }
} catch (e: any) {
  console.log('\n❌ contact_profiles table does not exist or query failed')
}

// 3. Check users table (maybe contact profiles are actually users)
const { data: user } = await supabase
  .from('users')
  .select('*')
  .eq('bubble_id', bubbleContactProfileId)
  .single()

if (user) {
  console.log('\n✅ Found as USER instead:')
  console.log(`   ID: ${user.id}`)
  console.log(`   Name: ${user.full_name}`)
  console.log(`   Email: ${user.email}`)
  console.log(`   Company: ${user.company_id}`)
}

// 4. Check if sheet has a created_by that matches
const { data: sheetFull } = await supabase
  .from('sheets')
  .select('created_by, contact_profile_id')
  .eq('id', sheetId)
  .single()

console.log('\n=== SHEET RELATIONSHIPS ===')
console.log(`Created by: ${sheetFull?.created_by}`)
console.log(`Contact profile: ${sheetFull?.contact_profile_id}`)

if (user && sheetFull?.created_by === user.id) {
  console.log('\n💡 The contact profile Bubble ID maps to the created_by user!')
  console.log('   This means the relationship is preserved, just in a different field')
}
