import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function fixKaisa() {
  // Find UPM company
  const { data: upm } = await supabase
    .from('companies')
    .select('id, name')
    .ilike('name', '%upm%');

  console.log('UPM companies found:', upm);

  // Get Kaisa's auth user from Supabase Auth
  const { data: { users: authUsers } } = await supabase.auth.admin.listUsers();
  const kaisa = authUsers?.find(u => u.email?.toLowerCase().includes('kaisa'));
  
  if (!kaisa) {
    console.log('Kaisa not found in auth users');
    return;
  }

  console.log('\nKaisa auth user:');
  console.log('  ID:', kaisa.id);
  console.log('  Email:', kaisa.email);

  // Check if user record exists
  const { data: existingUser } = await supabase
    .from('users')
    .select('*')
    .eq('id', kaisa.id)
    .single();

  if (existingUser) {
    console.log('\nUser record already exists:', existingUser);
  } else {
    console.log('\nNo user record found for Kaisa');
  }

  // Find UPM company (the real one)
  const { data: upmCompany } = await supabase
    .from('companies')
    .select('id, name')
    .eq('name', 'UPM')
    .single();

  console.log('\nUPM Company:', upmCompany);
}

fixKaisa();
