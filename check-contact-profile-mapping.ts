import { supabase } from './src/migration/supabase-client.js'

const bubbleContactProfileId = '1634039802123x481191206805307400'
const createdById = 'd3368824-591b-4fd2-974a-76418a848a02'

// Check if this user has that bubble ID
const { data: user } = await supabase
  .from('users')
  .select('*')
  .eq('id', createdById)
  .single()

console.log('=== CREATED BY USER ===')
console.log(`User ID: ${user?.id}`)
console.log(`Bubble ID: ${user?.bubble_id}`)
console.log(`Name: ${user?.full_name}`)
console.log(`Email: ${user?.email}`)

console.log('\n=== COMPARISON ===')
console.log(`Contact Profile Bubble ID: ${bubbleContactProfileId}`)
console.log(`User Bubble ID: ${user?.bubble_id}`)
console.log(`Match: ${user?.bubble_id === bubbleContactProfileId ? '✅ YES' : '❌ NO'}`)

if (user?.bubble_id !== bubbleContactProfileId) {
  // Search for the contact profile bubble ID in users
  const { data: contactUser } = await supabase
    .from('users')
    .select('*')
    .eq('bubble_id', bubbleContactProfileId)
    .single()

  if (contactUser) {
    console.log('\n✅ Found contact profile as different user:')
    console.log(`   User ID: ${contactUser.id}`)
    console.log(`   Name: ${contactUser.full_name}`)
    console.log(`   Email: ${contactUser.email}`)
  } else {
    console.log('\n❌ Contact profile Bubble ID not found in users table')
  }
}
