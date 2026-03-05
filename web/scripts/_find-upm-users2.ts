import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL as string,
  process.env.SUPABASE_SERVICE_ROLE_KEY as string,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

async function main() {
  const UPM = '86db93bf-9c1d-467a-9a2b-4625a5dbaaf1';

  // Check if there's a company_users or user_companies table
  const { data: tables } = await supabase.from('users').select('id').limit(0);

  // Check all users and their companies
  const { data: allUsers } = await supabase
    .from('users')
    .select('id, email, company_id, role')
    .limit(20);
  console.log('All users (first 20):');
  allUsers?.forEach(u => console.log(`  ${u.email} | company: ${u.company_id} | role: ${u.role}`));

  // Check the UPM company
  const { data: upmCompany } = await supabase
    .from('companies')
    .select('id, name')
    .eq('id', UPM)
    .single();
  console.log('\nUPM company:', upmCompany);

  // Check RLS policies - can Scott's user see sheets from other companies?
  // Let's check what the sheets table RLS allows
  // Check if there's an association/membership table
  const { data: assocSample } = await supabase
    .from('associations')
    .select('id, name')
    .limit(3);
  console.log('\nAssociations sample:', assocSample);

  // Check if there's a user_associations or company_associations table
  // Let's see what tables reference users
  const { data: companyAssoc } = await supabase
    .from('companies')
    .select('id, name, association_id')
    .eq('id', UPM)
    .single();
  console.log('\nUPM company with association:', companyAssoc);

  // Find Scott's company
  const { data: scottCompany } = await supabase
    .from('companies')
    .select('id, name, association_id')
    .eq('id', '125225e9-4691-4854-840d-d5c98fb2d1d5')
    .single();
  console.log('\nScott company:', scottCompany);
}

main().catch(err => { console.error(err); process.exit(1); });
