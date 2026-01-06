import { supabase } from './src/migration/supabase-client.js';

async function checkContacts() {
  const companyId = 'e5ddb7ab-99bd-40f1-9a5d-3731be1aa3b7'

  // Check if there's a contacts table
  const { data: contacts, error } = await supabase
    .from('contacts')
    .select('*')
    .eq('company_id', companyId)

  if (error) {
    console.log('❌ Error fetching contacts:', error.message)
  } else {
    console.log(`Found ${contacts?.length || 0} contacts for company`)
    if (contacts && contacts.length > 0) {
      console.log('\n=== CONTACT RECORDS ===')
      contacts.forEach((contact, idx) => {
        console.log(`\nContact ${idx + 1}:`)
        console.log(JSON.stringify(contact, null, 2))
      })
    }
  }

  // Also check if sheet has a direct contact
  const { data: sheet } = await supabase
    .from('sheets')
    .select('contact_id')
    .eq('id', '548f08be-3b2a-465f-94b4-a2279bee9819')
    .single()

  console.log(`\n=== SHEET CONTACT ===`)
  console.log(`Contact ID: ${sheet?.contact_id}`)

  if (sheet?.contact_id) {
    const { data: contact } = await supabase
      .from('contacts')
      .select('*')
      .eq('id', sheet.contact_id)
      .single()

    if (contact) {
      console.log('\nContact details:')
      console.log(JSON.stringify(contact, null, 2))
    }
  }
}

checkContacts().catch(console.error)
