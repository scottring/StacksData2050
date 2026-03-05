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

  const { data: users } = await supabase
    .from('users')
    .select('id, email, first_name, last_name, role, company_id')
    .eq('company_id', UPM);

  console.log(`UPM users (${users?.length || 0}):`);
  users?.forEach(u => console.log(`  ${u.email} | ${u.first_name} ${u.last_name} | ${u.role}`));
}

main().catch(err => { console.error(err); process.exit(1); });
