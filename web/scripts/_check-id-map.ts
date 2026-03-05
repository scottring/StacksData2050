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
  // Check _migration_id_map
  const { data, error } = await supabase
    .from('_migration_id_map')
    .select('*')
    .limit(3);

  if (error) {
    console.log('_migration_id_map error:', error.message);

    // Check if answers have bubble_id
    const { data: answers } = await supabase.from('answers').select('*').limit(1);
    if (answers?.[0]) {
      console.log('\nAnswer columns:', Object.keys(answers[0]).join(', '));
      const hasBubbleId = 'bubble_id' in answers[0];
      console.log('Has bubble_id:', hasBubbleId);
    }
    return;
  }

  console.log('_migration_id_map sample:');
  console.log(data);

  // Check structure
  if (data?.[0]) {
    console.log('Columns:', Object.keys(data[0]).join(', '));
  }

  // Count answer mappings
  const { count } = await supabase
    .from('_migration_id_map')
    .select('id', { count: 'exact', head: true })
    .eq('entity_type', 'answer');

  console.log(`\nAnswer ID mappings: ${count}`);

  // Sample answer mapping
  const { data: sample } = await supabase
    .from('_migration_id_map')
    .select('*')
    .eq('entity_type', 'answer')
    .limit(3);
  console.log('Sample answer mappings:', sample);

  // Also check if answers table has bubble_id directly
  const { data: answerSample } = await supabase.from('answers').select('id, bubble_id').limit(3);
  console.log('\nAnswer bubble_id check:', answerSample);
}

main().catch(err => { console.error(err); process.exit(1); });
