import { supabase } from './src/migration/supabase-client.js';

async function checkContactProfile() {
  const sheetId = '548f08be-3b2a-465f-94b4-a2279bee9819'

  // Get the sheet's contact_profile_id
  const { data: sheet } = await supabase
    .from('sheets')
    .select('contact_profile_id')
    .eq('id', sheetId)
    .single()

  console.log('=== SHEET CONTACT PROFILE ===')
  console.log('contact_profile_id:', sheet?.contact_profile_id)

  if (sheet?.contact_profile_id) {
    // Get the contact profile data
    const { data: contactProfile } = await supabase
      .from('contact_profiles')
      .select('*')
      .eq('id', sheet.contact_profile_id)
      .single()

    console.log('\n=== CONTACT PROFILE DATA ===')
    if (contactProfile) {
      console.log('Company:', contactProfile.company_name)
      console.log('Address:', contactProfile.address)
      console.log('Email:', contactProfile.email)
      console.log('Phone:', contactProfile.phone)
      console.log('Created:', contactProfile.created_at)
      console.log('All fields:', Object.keys(contactProfile))
    } else {
      console.log('Contact profile not found')
    }
  } else {
    console.log('No contact_profile_id on sheet')
  }

  // Check for Contact Profile section in sections
  const { data: sections } = await supabase
    .from('sections')
    .select('*')
    .ilike('name', '%contact%profile%')

  console.log('\n=== CONTACT PROFILE SECTIONS ===')
  if (sections && sections.length > 0) {
    sections.forEach(sec => {
      console.log(`Name: ${sec.name}`)
      console.log(`ID: ${sec.id}`)
      console.log(`Order: ${sec.order_number}`)
    })
  } else {
    console.log('No Contact Profile section found')
  }
}

checkContactProfile().catch(console.error)
