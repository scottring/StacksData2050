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

const UPM_ID = '86db93bf-9c1d-467a-9a2b-4625a5dbaaf1';
const SAPPI_ID = '9567b9ac-1c12-457f-8e49-321519c267b3';

async function main() {
  // Get UPM+Sappi sheet IDs
  const { data: sheets } = await supabase
    .from('sheets')
    .select('id, requesting_company_id')
    .in('requesting_company_id', [UPM_ID, SAPPI_ID]);

  const sheetIds = (sheets || []).map(s => s.id);
  console.log(`UPM+Sappi sheets: ${sheetIds.length}`);

  // Check answers table columns first
  const { data: sample } = await supabase.from('answers').select('*').limit(1);
  const cols = sample?.[0] ? Object.keys(sample[0]) : [];
  console.log(`Answer columns: ${cols.join(', ')}`);

  const hasFileUrl = cols.includes('file_url');
  const hasSupportFileUrl = cols.includes('support_file_url');
  console.log(`Has file_url: ${hasFileUrl}, Has support_file_url: ${hasSupportFileUrl}`);

  if (!hasFileUrl && !hasSupportFileUrl) {
    console.log('\nNo file URL columns found on answers table. Checking if they exist but are empty...');
    // Try selecting specifically
    const { data: test, error } = await supabase.from('answers').select('file_url').limit(1);
    console.log('file_url select:', error?.message || 'exists');
    const { data: test2, error: err2 } = await supabase.from('answers').select('support_file_url').limit(1);
    console.log('support_file_url select:', err2?.message || 'exists');
    return;
  }

  // Count answers with file_url in UPM+Sappi sheets
  let totalWithFile = 0;
  let totalWithSupport = 0;
  let sampleUrls: string[] = [];
  const BATCH = 50;

  for (let i = 0; i < sheetIds.length; i += BATCH) {
    const batch = sheetIds.slice(i, i + BATCH);

    if (hasFileUrl) {
      const { data: withFile } = await supabase
        .from('answers')
        .select('id, file_url')
        .in('sheet_id', batch)
        .not('file_url', 'is', null);
      totalWithFile += (withFile || []).length;
      for (const a of (withFile || []).slice(0, 3)) {
        if (sampleUrls.length < 10) sampleUrls.push(a.file_url);
      }
    }

    if (hasSupportFileUrl) {
      const { data: withSupport } = await supabase
        .from('answers')
        .select('id, support_file_url')
        .in('sheet_id', batch)
        .not('support_file_url', 'is', null);
      totalWithSupport += (withSupport || []).length;
      for (const a of (withSupport || []).slice(0, 3)) {
        if (sampleUrls.length < 10) sampleUrls.push(a.support_file_url);
      }
    }
  }

  console.log(`\n=== File Attachment Counts (UPM+Sappi) ===`);
  console.log(`Answers with file_url: ${totalWithFile}`);
  console.log(`Answers with support_file_url: ${totalWithSupport}`);
  console.log(`Total files to migrate: ${totalWithFile + totalWithSupport}`);

  console.log(`\n=== Sample URLs ===`);
  for (const url of sampleUrls) {
    console.log(`  ${url}`);
  }

  // Also check ALL answers (not just UPM+Sappi)
  if (hasFileUrl) {
    const { count } = await supabase
      .from('answers')
      .select('id', { count: 'exact', head: true })
      .not('file_url', 'is', null);
    console.log(`\nAll answers with file_url (global): ${count}`);
  }
  if (hasSupportFileUrl) {
    const { count } = await supabase
      .from('answers')
      .select('id', { count: 'exact', head: true })
      .not('support_file_url', 'is', null);
    console.log(`All answers with support_file_url (global): ${count}`);
  }
}

main().catch(err => { console.error(err); process.exit(1); });
