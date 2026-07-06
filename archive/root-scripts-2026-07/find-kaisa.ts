import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function findKaisa() {
  // List all auth users (with pagination)
  let page = 1;
  let found = false;
  
  while (!found && page <= 10) {
    const { data: { users } } = await supabase.auth.admin.listUsers({
      page,
      perPage: 100
    });
    
    if (!users || users.length === 0) break;
    
    console.log('Page ' + page + ': ' + users.length + ' users');
    
    for (const u of users) {
      if (u.email?.toLowerCase().includes('kaisa') || u.email?.toLowerCase().includes('upm')) {
        console.log('  FOUND: ' + u.email + ' (ID: ' + u.id + ')');
        found = true;
      }
    }
    
    // Show first few emails from each page
    if (!found) {
      console.log('  Sample: ' + users.slice(0, 3).map(u => u.email).join(', '));
    }
    
    page++;
  }
  
  if (!found) {
    console.log('\nKaisa not found. Listing all auth user emails:');
    const { data: { users } } = await supabase.auth.admin.listUsers({ perPage: 1000 });
    users?.forEach(u => console.log('  ' + u.email));
  }
}

findKaisa();
