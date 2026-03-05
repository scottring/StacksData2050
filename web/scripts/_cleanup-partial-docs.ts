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
  // Count existing
  const { count } = await supabase.from('answer_documents').select('id', { count: 'exact', head: true });
  console.log(`answer_documents before cleanup: ${count}`);

  if (count && count > 0) {
    // Delete all — they're from the failed run
    const { error } = await supabase.from('answer_documents').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    console.log('Deleted:', error?.message || 'ok');
  }

  const { count: after } = await supabase.from('answer_documents').select('id', { count: 'exact', head: true });
  console.log(`answer_documents after cleanup: ${after}`);

  // Check storage bucket
  const { data: files } = await supabase.storage.from('answer-files').list('', { limit: 100 });
  console.log(`\nStorage files/folders: ${files?.length || 0}`);
  // Clean up uploaded files too
  if (files && files.length > 0) {
    for (const f of files) {
      // These are folder names (answer UUIDs), need to recurse
      const { data: subFiles } = await supabase.storage.from('answer-files').list(f.name, { limit: 100 });
      if (subFiles) {
        for (const sf of subFiles) {
          const { data: deepFiles } = await supabase.storage.from('answer-files').list(`${f.name}/${sf.name}`, { limit: 100 });
          if (deepFiles && deepFiles.length > 0) {
            const paths = deepFiles.map(df => `${f.name}/${sf.name}/${df.name}`);
            await supabase.storage.from('answer-files').remove(paths);
            console.log(`  Removed ${paths.length} files from ${f.name}/${sf.name}/`);
          }
        }
      }
    }
  }
}

main().catch(err => { console.error(err); process.exit(1); });
