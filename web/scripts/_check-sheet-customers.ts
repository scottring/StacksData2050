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
  // Check sheets table columns
  const { data: sampleSheet } = await supabase.from('sheets').select('*').limit(1);
  console.log('=== Sheet columns ===');
  console.log(Object.keys(sampleSheet![0]).join(', '));

  // Check stacks table
  const { data: stacks } = await supabase.from('stacks').select('*').limit(3);
  console.log('\n=== Stacks sample ===');
  console.log(stacks);

  // Check associations table
  const { data: assocs } = await supabase.from('associations').select('*').limit(3);
  console.log('\n=== Associations sample ===');
  console.log(assocs);

  // Check if sheets have a stack_id
  const { data: sheets } = await supabase.from('sheets').select('id, company_id, stack_id, name').limit(5);
  console.log('\n=== Sheet samples (with stack_id) ===');
  console.log(sheets);

  // Count sheets by stack_id
  const { data: allSheets } = await supabase.from('sheets').select('stack_id');
  const byStack: Record<string, number> = {};
  for (const s of allSheets || []) {
    byStack[s.stack_id] = (byStack[s.stack_id] || 0) + 1;
  }

  // Get stack names
  const { data: allStacks } = await supabase.from('stacks').select('id, name, association_id');
  const stackMap = new Map((allStacks || []).map(s => [s.id, s]));

  console.log('\n=== Sheets per stack ===');
  for (const [stackId, count] of Object.entries(byStack).sort((a, b) => b[1] - a[1])) {
    const stack = stackMap.get(stackId);
    console.log(`  ${stack?.name || '?'} (assoc: ${stack?.association_id?.slice(0,8) || '?'}): ${count} sheets`);
  }

  // Get association names
  const { data: allAssocs } = await supabase.from('associations').select('id, name');
  console.log('\n=== All associations ===');
  for (const a of allAssocs || []) {
    console.log(`  ${a.name} -> ${a.id}`);
  }
}

main().catch(err => { console.error(err); process.exit(1); });
