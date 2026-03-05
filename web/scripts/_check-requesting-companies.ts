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
  const { data: companies } = await supabase.from('companies').select('id, name');
  const companyMap = new Map((companies || []).map(c => [c.id, c.name]));

  const { data: sheets } = await supabase.from('sheets').select('id, requesting_company_id');
  const byRequester: Record<string, number> = {};
  for (const s of sheets || []) {
    const key = s.requesting_company_id || 'null';
    byRequester[key] = (byRequester[key] || 0) + 1;
  }

  console.log('=== Sheets by requesting company (customer) ===');
  for (const [companyId, count] of Object.entries(byRequester).sort((a, b) => b[1] - a[1])) {
    const name = companyMap.get(companyId) || companyId;
    console.log(`  ${name}: ${count} sheets`);
  }

  // UPM and Sappi IDs
  const upmId = '86db93bf-9c1d-467a-9a2b-4625a5dbaaf1';
  const sappiId = '9567b9ac-1c12-457f-8e49-321519c267b3';

  // Count answers scoped to UPM/Sappi sheets
  const upmSappiSheetIds = (sheets || [])
    .filter(s => s.requesting_company_id === upmId || s.requesting_company_id === sappiId)
    .map(s => s.id);

  console.log(`\nUPM + Sappi sheet count: ${upmSappiSheetIds.length}`);

  // Count answers in those sheets that match accepted mappings
  const { data: acceptedMappings } = await supabase
    .from('normalization_mappings')
    .select('legacy_question_id, canonical_parameter_id')
    .eq('status', 'accepted');

  const questionIds = (acceptedMappings || []).map(m => m.legacy_question_id);

  // Count in batches (PostgREST can't handle huge IN clauses)
  let totalLinked = 0;
  let totalAll = 0;
  const batchSize = 100;
  for (let i = 0; i < upmSappiSheetIds.length; i += batchSize) {
    const batch = upmSappiSheetIds.slice(i, i + batchSize);
    const { count: allCount } = await supabase
      .from('answers')
      .select('id', { count: 'exact', head: true })
      .in('sheet_id', batch);
    totalAll += allCount || 0;

    const { count: linkedCount } = await supabase
      .from('answers')
      .select('id', { count: 'exact', head: true })
      .in('sheet_id', batch)
      .in('question_id', questionIds);
    totalLinked += linkedCount || 0;
  }

  console.log(`Total answers in UPM+Sappi sheets: ${totalAll}`);
  console.log(`Answers linkable (accepted mapping questions): ${totalLinked}`);
  console.log(`Orphaned (no accepted mapping): ${totalAll - totalLinked}`);
}

main().catch(err => { console.error(err); process.exit(1); });
