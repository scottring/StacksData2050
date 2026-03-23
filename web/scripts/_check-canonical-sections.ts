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
  const { data } = await supabase
    .from('canonical_parameters')
    .select('code, name, section, subsection')
    .order('sort_order');

  console.log('=== CANONICAL SECTIONS ===');
  let currentSection = '';
  let currentSub = '';
  data?.forEach(p => {
    if (p.section !== currentSection) {
      currentSection = p.section || '';
      console.log(`\n[SECTION] ${currentSection}`);
    }
    if (p.subsection !== currentSub) {
      currentSub = p.subsection || '';
      console.log(`  [SUB] ${currentSub}`);
    }
    console.log(`    ${p.code} - ${p.name}`);
  });

  // Also check legacy section 1
  console.log('\n\n=== LEGACY SECTION 1 (Product Information) ===');
  const { data: legacyQ } = await supabase
    .from('questions')
    .select('name, order_number, subsections(name, sections(name, order_number))')
    .eq('subsections.sections.order_number', 1)
    .order('order_number')
    .limit(20);

  legacyQ?.forEach((q: any) => {
    if (q.subsections?.sections) {
      console.log(`  ${q.subsections.sections.order_number}.${q.subsections.order_number || '?'}.${q.order_number} - ${q.name}`);
    }
  });
}

main().catch(err => { console.error(err); process.exit(1); });
