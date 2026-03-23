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
  const answerIds = [
    '61746a53-0970-452c-8857-86e030b5947d',
    '40a0c3d0-0da6-4df4-8ee6-98722203072d',
    'f4e44302-21a2-4d81-a857-1619487c9c34',
    '68bd854f-7c36-409a-935e-40f18e8e8e07',
    '171f23a8-27a1-452e-97ec-7659ea7a7081',
  ];

  const { data } = await supabase
    .from('answers')
    .select('id, question_id, text_value, text_area_value, questions(name, order_number)')
    .in('id', answerIds);

  console.log('=== SECTION 1 ANSWER VALUES ===');
  data?.sort((a: any, b: any) => (a.questions?.order_number || 0) - (b.questions?.order_number || 0));
  data?.forEach((a: any) => {
    const val = a.text_value || a.text_area_value || '(empty)';
    console.log(`  ${a.questions?.name}: "${val}"`);
  });
}

main().catch(err => { console.error(err); process.exit(1); });
