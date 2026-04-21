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
  const sheetId = '5cedf833-8c7b-444e-af5e-c3c1f0f5e8f8';

  // Direct query with error
  const { data, error, count } = await supabase
    .from('answers')
    .select('id, question_id, text_value, text_area_value', { count: 'exact' })
    .eq('sheet_id', sheetId)
    .limit(5);

  console.log('Error:', error);
  console.log('Count:', count);
  console.log('Data sample:', data?.slice(0, 3));

  // Try the view instead
  const { data: viewData, error: viewError, count: viewCount } = await supabase
    .from('sheet_answers_display')
    .select('*', { count: 'exact' })
    .eq('sheet_id', sheetId)
    .limit(3);

  console.log('\nView Error:', viewError);
  console.log('View Count:', viewCount);
  console.log('View sample:', viewData?.slice(0, 1));
}

main().catch(err => { console.error(err); process.exit(1); });
