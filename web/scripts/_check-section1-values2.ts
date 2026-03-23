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

  for (const aid of answerIds) {
    const { data: answer } = await supabase
      .from('answers')
      .select('id, question_id, text_value, text_area_value')
      .eq('id', aid)
      .single();

    if (answer) {
      const { data: question } = await supabase
        .from('questions')
        .select('name, order_number')
        .eq('id', answer.question_id)
        .single();

      const val = answer.text_value || answer.text_area_value || '(empty)';
      console.log(`  ${question?.name || 'Unknown'} (order ${question?.order_number}): "${val}"`);
    }
  }
}

main().catch(err => { console.error(err); process.exit(1); });
