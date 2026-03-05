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
  // Check RLS policies on sheets table
  const { data, error } = await supabase.rpc('is_super_admin');
  console.log('is_super_admin (service role):', data, error?.message);

  // Try to query sheets as service role (bypasses RLS)
  const { count } = await supabase
    .from('sheets')
    .select('id', { count: 'exact', head: true });
  console.log('Total sheets (service role):', count);

  // Check if there are any RLS policies we can see
  // Check the pg_policies view
  const { data: policies, error: pErr } = await supabase
    .from('pg_policies')
    .select('*')
    .eq('tablename', 'sheets');
  if (pErr) {
    console.log('Cannot query pg_policies:', pErr.message);
  } else {
    console.log('Sheets RLS policies:', policies);
  }
}

main().catch(err => { console.error(err); process.exit(1); });
