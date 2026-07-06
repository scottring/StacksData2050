import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const KAISA_AUTH_ID = '3ed3110d-990b-402e-912a-17095cbeb7ef';
const KAISA_EMAIL = 'kaisa.herranen@upm.com';
const UPM_COMPANY_ID = '86db93bf-9c1d-467a-9a2b-4625a5dbaaf1';

async function fixKaisaUser() {
  // Check if user record exists with this ID
  const { data: existingUser } = await supabase
    .from('users')
    .select('*')
    .eq('id', KAISA_AUTH_ID)
    .single();

  if (existingUser) {
    console.log('User record already exists:', existingUser);
    
    // Update company_id if needed
    if (existingUser.company_id !== UPM_COMPANY_ID) {
      console.log('Updating company_id...');
      const { error } = await supabase
        .from('users')
        .update({ company_id: UPM_COMPANY_ID })
        .eq('id', KAISA_AUTH_ID);
      
      if (error) {
        console.log('Error updating:', error.message);
      } else {
        console.log('Updated company_id to UPM');
      }
    }
    return;
  }

  // Check if there's a user with this email
  const { data: emailUser } = await supabase
    .from('users')
    .select('*')
    .eq('email', KAISA_EMAIL)
    .single();

  if (emailUser) {
    console.log('Found user by email with different ID:', emailUser);
    // Update the ID to match auth
    const { error } = await supabase
      .from('users')
      .update({ id: KAISA_AUTH_ID, company_id: UPM_COMPANY_ID })
      .eq('email', KAISA_EMAIL);
    
    if (error) {
      console.log('Error updating ID:', error.message);
    } else {
      console.log('Updated user ID to match auth');
    }
    return;
  }

  // Create new user record
  console.log('Creating new user record for Kaisa...');
  const { data, error } = await supabase
    .from('users')
    .insert({
      id: KAISA_AUTH_ID,
      email: KAISA_EMAIL,
      full_name: 'Kaisa Herranen',
      company_id: UPM_COMPANY_ID,
      role: 'user'
    })
    .select()
    .single();

  if (error) {
    console.log('Error creating user:', error.message);
  } else {
    console.log('Created user record:', data);
  }
}

fixKaisaUser();
