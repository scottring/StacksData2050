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
  // 1. Check if answer_documents table exists and its structure
  const { data: docs, error: docErr } = await supabase
    .from('answer_documents')
    .select('*')
    .limit(3);

  if (docErr) {
    console.log('answer_documents table error:', docErr.message);
    // Try alternate table names
    for (const table of ['documents', 'attachments', 'files', 'answer_files']) {
      const { data, error } = await supabase.from(table).select('*').limit(1);
      if (!error) {
        console.log(`Found table: ${table}`, Object.keys(data![0]));
      }
    }
  } else {
    console.log('=== answer_documents columns ===');
    if (docs && docs.length > 0) {
      console.log(Object.keys(docs[0]).join(', '));
      console.log('\nSample rows:');
      for (const d of docs) {
        console.log(JSON.stringify(d, null, 2));
      }
    } else {
      console.log('Table exists but is empty');
    }
  }

  // 2. Count total documents
  const { count: totalDocs } = await supabase
    .from('answer_documents')
    .select('id', { count: 'exact', head: true });
  console.log(`\nTotal answer_documents: ${totalDocs}`);

  // 3. Get UPM+Sappi sheet IDs
  const { data: sheets } = await supabase
    .from('sheets')
    .select('id, requesting_company_id')
    .in('requesting_company_id', [UPM_ID, SAPPI_ID]);

  const upmSheetIds = (sheets || []).filter(s => s.requesting_company_id === UPM_ID).map(s => s.id);
  const sappiSheetIds = (sheets || []).filter(s => s.requesting_company_id === SAPPI_ID).map(s => s.id);

  console.log(`\nUPM sheets: ${upmSheetIds.length}, Sappi sheets: ${sappiSheetIds.length}`);

  // 4. Check if answer_documents links to answers or sheets
  // Count docs for UPM+Sappi
  // First check what FK columns exist
  const { data: sampleDoc } = await supabase.from('answer_documents').select('*').limit(1);
  if (sampleDoc && sampleDoc.length > 0) {
    const cols = Object.keys(sampleDoc[0]);
    console.log('\nDoc columns:', cols);

    // Check if there's an answer_id or sheet_id column
    if (cols.includes('answer_id')) {
      // Get answer IDs for UPM+Sappi sheets
      const allSheetIds = [...upmSheetIds, ...sappiSheetIds];
      let docCount = 0;
      const BATCH = 100;
      for (let i = 0; i < allSheetIds.length; i += BATCH) {
        const batch = allSheetIds.slice(i, i + BATCH);
        // Get answers for these sheets
        const { data: answers } = await supabase
          .from('answers')
          .select('id')
          .in('sheet_id', batch);
        const answerIds = (answers || []).map(a => a.id);
        if (answerIds.length > 0) {
          // Count docs for these answers (batch answerIds too)
          const ANS_BATCH = 500;
          for (let j = 0; j < answerIds.length; j += ANS_BATCH) {
            const ansBatch = answerIds.slice(j, j + ANS_BATCH);
            const { count } = await supabase
              .from('answer_documents')
              .select('id', { count: 'exact', head: true })
              .in('answer_id', ansBatch);
            docCount += count || 0;
          }
        }
      }
      console.log(`\nDocuments for UPM+Sappi answers: ${docCount}`);
    }

    if (cols.includes('sheet_id')) {
      const allSheetIds = [...upmSheetIds, ...sappiSheetIds];
      let docCount = 0;
      const BATCH = 100;
      for (let i = 0; i < allSheetIds.length; i += BATCH) {
        const batch = allSheetIds.slice(i, i + BATCH);
        const { count } = await supabase
          .from('answer_documents')
          .select('id', { count: 'exact', head: true })
          .in('sheet_id', batch);
        docCount += count || 0;
      }
      console.log(`\nDocuments for UPM+Sappi sheets: ${docCount}`);
    }
  }

  // 5. Check Supabase storage buckets
  const { data: buckets, error: bucketErr } = await supabase.storage.listBuckets();
  console.log('\n=== Storage Buckets ===');
  if (bucketErr) {
    console.log('Error:', bucketErr.message);
  } else {
    for (const b of buckets || []) {
      console.log(`  ${b.name} (public: ${b.public})`);
    }
  }

  // 6. Check if docs have URLs pointing to Bubble vs Supabase
  const { data: urlSample } = await supabase
    .from('answer_documents')
    .select('id, file_url, file_name, file_type')
    .limit(10);

  if (urlSample) {
    console.log('\n=== Document URL samples ===');
    for (const d of urlSample) {
      const url = (d as any).file_url || (d as any).url || (d as any).storage_path || 'no url field';
      console.log(`  ${(d as any).file_name || 'unnamed'}: ${typeof url === 'string' ? url.slice(0, 100) : JSON.stringify(url)}`);
    }
  }
}

main().catch(err => { console.error(err); process.exit(1); });
