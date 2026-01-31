import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function checkUser() {
  // Find Kaisa's user record
  const { data: user, error } = await supabase
    .from('users')
    .select('id, email, full_name, company_id')
    .ilike('email', '%kaisa%')
    .single();

  if (error) {
    console.log('Error finding user:', error.message);
    
    // List all users with their companies
    const { data: allUsers } = await supabase
      .from('users')
      .select('id, email, full_name, company_id')
      .limit(10);
    
    console.log('\nFirst 10 users:');
    allUsers?.forEach(u => console.log('  ' + u.email + ' -> company: ' + u.company_id));
    return;
  }

  console.log('Kaisa user record:');
  console.log('  ID:', user.id);
  console.log('  Email:', user.email);
  console.log('  Name:', user.full_name);
  console.log('  Company ID:', user.company_id);

  if (user.company_id) {
    const { data: company } = await supabase
      .from('companies')
      .select('id, name')
      .eq('id', user.company_id)
      .single();
    
    console.log('  Company Name:', company?.name || 'NOT FOUND');
  }

  // Find UPM company
  const { data: upm } = await supabase
    .from('companies')
    .select('id, name')
    .ilike('name', '%upm%')
    .single();

  if (upm) {
    console.log('\nUPM Company:');
    console.log('  ID:', upm.id);
    console.log('  Name:', upm.name);
    
    // Count sheets for UPM
    const { count: supplierCount } = await supabase
      .from('sheets')
      .select('*', { count: 'exact', head: true })
      .eq('company_id', upm.id);
    
    const { count: customerCount } = await supabase
      .from('sheets')
      .select('*', { count: 'exact', head: true })
      .eq('requesting_company_id', upm.id);
    
    console.log('  Sheets as supplier (company_id):', supplierCount);
    console.log('  Sheets as customer (requesting_company_id):', customerCount);
  }
}

checkUser();
