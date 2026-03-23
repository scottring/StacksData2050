import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL as string,
  process.env.SUPABASE_SERVICE_ROLE_KEY as string
);

async function main() {
  const { data } = await supabase
    .from('canonical_parameters')
    .select('code, name, section')
    .order('sort_order');

  data?.forEach(p => {
    console.log(`${p.code}\t${p.section}\t${p.name?.substring(0, 80)}`);
  });
  console.log(`\nTotal: ${data?.length}`);
}

main().catch(err => { console.error(err); process.exit(1); });
