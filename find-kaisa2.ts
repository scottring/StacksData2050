import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function findKaisa() {
  // Get ALL auth users
  const { data: { users }, error } = await supabase.auth.admin.listUsers({ perPage: 1000 });
  
  if (error) {
    console.log('Error:', error.message);
    return;
  }
  
  console.log('Total auth users:', users?.length);
  
  // Find all UPM users
  const upmUsers = users?.filter(u => u.email?.toLowerCase().includes('upm')) || [];
  console.log('\nUPM users (' + upmUsers.length + '):');
  upmUsers.forEach(u => console.log('  ' + u.email + ' -> ' + u.id));
  
  // Find Kaisa specifically
  const kaisa = users?.find(u => u.email?.toLowerCase().includes('kaisa'));
  if (kaisa) {
    console.log('\nKaisa found:', kaisa.email, kaisa.id);
  } else {
    console.log('\nKaisa NOT in auth users list');
    // Show all emails containing 'ka'
    const kaUsers = users?.filter(u => u.email?.toLowerCase().includes('ka')) || [];
    console.log('Users with "ka" in email:', kaUsers.map(u => u.email));
  }
}

findKaisa();
