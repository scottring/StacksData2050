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
  const UPM_ID = '86db93bf-9c1d-467a-9a2b-4625a5dbaaf1';

  // Find UPM sheets
  const { data: sheets } = await supabase
    .from('sheets')
    .select('id, name')
    .eq('requesting_company_id', UPM_ID)
    .limit(5);

  if (!sheets || sheets.length === 0) {
    console.log('No UPM sheets found');
    return;
  }

  for (const s of sheets) {
    // Count canonical links for this sheet's answers
    const { data: answers } = await supabase
      .from('sheet_answers_display')
      .select('id')
      .eq('sheet_id', s.id)
      .limit(200);

    const answerCount = answers?.length || 0;
    const ids = answers?.map(a => a.id) || [];

    let linkCount = 0;
    if (ids.length > 0) {
      // Check first batch
      const { count } = await supabase
        .from('canonical_answer_links')
        .select('id', { count: 'exact', head: true })
        .in('answer_id', ids.slice(0, 50));
      linkCount = count || 0;
    }

    console.log(`${s.id} | ${s.name} | answers: ${answerCount} | links: ${linkCount}+`);
  }
}

main().catch(err => { console.error(err); process.exit(1); });
