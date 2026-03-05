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
  // Check answer_documents table structure via information_schema workaround
  // Try inserting a dummy to see what columns are needed
  const { error: insertErr } = await supabase
    .from('answer_documents')
    .insert({ id: '00000000-0000-0000-0000-000000000000' });

  console.log('Insert error (reveals required columns):', insertErr?.message);

  // Check answer_files bucket contents
  const { data: files, error: fileErr } = await supabase.storage
    .from('answer-files')
    .list('', { limit: 10 });

  console.log('\n=== answer-files bucket ===');
  if (fileErr) {
    console.log('Error:', fileErr.message);
  } else {
    console.log(`Files/folders: ${files?.length || 0}`);
    for (const f of files || []) {
      console.log(`  ${f.name} (${f.metadata?.size || 'folder'})`);
    }
  }

  // Check question-attachments bucket
  const { data: qFiles } = await supabase.storage
    .from('question-attachments')
    .list('', { limit: 10 });
  console.log('\n=== question-attachments bucket ===');
  console.log(`Files/folders: ${qFiles?.length || 0}`);
  for (const f of qFiles || []) {
    console.log(`  ${f.name}`);
  }

  // Check the Bubble env vars
  const bubbleUrl = process.env.BUBBLE_API_URL || process.env.BUBBLE_BASE_URL;
  const bubbleToken = process.env.BUBBLE_API_TOKEN;
  console.log('\n=== Bubble API ===');
  console.log(`URL: ${bubbleUrl || 'NOT SET'}`);
  console.log(`Token: ${bubbleToken ? bubbleToken.slice(0, 10) + '...' : 'NOT SET'}`);

  // Check the stacks/.env for Bubble credentials
  const staksEnvPath = path.resolve(__dirname, '../../.env');
  try {
    const { config } = dotenv;
    const result = dotenv.config({ path: staksEnvPath });
    const bUrl = result.parsed?.BUBBLE_API_URL || result.parsed?.BUBBLE_BASE_URL;
    const bToken = result.parsed?.BUBBLE_API_TOKEN;
    console.log(`\nstacks/.env Bubble URL: ${bUrl || 'NOT SET'}`);
    console.log(`stacks/.env Bubble Token: ${bToken ? bToken.slice(0, 10) + '...' : 'NOT SET'}`);
  } catch (e) {
    console.log('No stacks/.env found');
  }
}

main().catch(err => { console.error(err); process.exit(1); });
