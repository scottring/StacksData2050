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

  // Find UPM-requested sheets with most canonical links
  const { data: sheets } = await supabase
    .from('sheets')
    .select('id, name, company_id, companies!sheets_company_id_fkey(name)')
    .eq('requesting_company_id', UPM)
    .limit(20);

  if (!sheets) return;

  const results: Array<{ id: string; supplier: string; name: string; links: number }> = [];

  for (const s of sheets) {
    const { data: answers } = await supabase
      .from('answers')
      .select('id')
      .eq('sheet_id', s.id)
      .limit(300);
    const ids = answers?.map(a => a.id) || [];
    let linkCount = 0;
    if (ids.length > 0) {
      const { count } = await supabase
        .from('canonical_answer_links')
        .select('id', { count: 'exact', head: true })
        .in('answer_id', ids.slice(0, 50));
      linkCount = count || 0;
    }
    results.push({
      id: s.id,
      supplier: (s as any).companies?.name || '?',
      name: s.name,
      links: linkCount
    });
  }

  results.sort((a, b) => b.links - a.links);
  console.log('Top UPM sheets by canonical links:');
  results.forEach(r => console.log(`  ${r.id} | ${r.supplier} | ${r.name} | ${r.links} links`));
}

main().catch(err => { console.error(err); process.exit(1); });
