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
  const sheetId = '5cedf833-8c7b-444e-af5e-c3c1f0f5e8f8';

  // Check requesting_company_id
  const { data: sheet } = await supabase
    .from('sheets')
    .select('id, name, requesting_company_id, company_id')
    .eq('id', sheetId)
    .single();
  console.log('Sheet:', sheet);
  console.log('requesting_company_id matches UPM?', sheet?.requesting_company_id === '86db93bf-9c1d-467a-9a2b-4625a5dbaaf1');

  // Canonical path: what sections/params would show
  const { data: answers } = await supabase
    .from('sheet_answers_display')
    .select('id')
    .eq('sheet_id', sheetId);
  const answerIds = answers?.map(a => a.id) || [];

  const links: any[] = [];
  for (let i = 0; i < answerIds.length; i += 50) {
    const { data } = await supabase
      .from('canonical_answer_links')
      .select('answer_id, canonical_parameter_id')
      .in('answer_id', answerIds.slice(i, i + 50));
    if (data) links.push(...data);
  }

  const paramIds = [...new Set(links.map(l => l.canonical_parameter_id))];
  const { data: params } = await supabase
    .from('canonical_parameters')
    .select('code, name, section, subsection, sort_order')
    .in('id', paramIds)
    .order('sort_order');

  console.log('\n=== CANONICAL VIEW would show ===');
  let currentSection = '';
  let currentSub = '';
  params?.forEach(p => {
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

  // Legacy path: what sections would show
  const { data: sheetTags } = await supabase.from('sheet_tags').select('tag_id').eq('sheet_id', sheetId);
  const tagIds = sheetTags?.map(st => st.tag_id) || [];
  if (tagIds.length > 0) {
    const { data: qt } = await supabase.from('question_tags').select('question_id').in('tag_id', tagIds);
    const qIds = [...new Set(qt?.map(q => q.question_id) || [])];
    const { data: questions } = await supabase
      .from('questions')
      .select('id, name, order_number, subsections(name, order_number, sections(name, order_number))')
      .in('id', qIds.slice(0, 50));

    console.log('\n\n=== LEGACY VIEW would show ===');
    let legacySection = '';
    let legacySub = '';
    const sorted = questions?.sort((a: any, b: any) => {
      const sa = a.subsections?.sections?.order_number || 0;
      const sb = b.subsections?.sections?.order_number || 0;
      if (sa !== sb) return sa - sb;
      const ssa = a.subsections?.order_number || 0;
      const ssb = b.subsections?.order_number || 0;
      if (ssa !== ssb) return ssa - ssb;
      return (a.order_number || 0) - (b.order_number || 0);
    });
    sorted?.forEach((q: any) => {
      const secName = q.subsections?.sections?.name || '?';
      const subName = q.subsections?.name || '?';
      const secNum = q.subsections?.sections?.order_number || 0;
      const subNum = q.subsections?.order_number || 0;
      if (secName !== legacySection) {
        legacySection = secName;
        console.log(`\n[SECTION ${secNum}] ${legacySection}`);
      }
      if (subName !== legacySub) {
        legacySub = subName;
        console.log(`  [SUB ${secNum}.${subNum}] ${legacySub}`);
      }
      console.log(`    ${secNum}.${subNum}.${q.order_number} - ${q.name}`);
    });
  }
}

main().catch(err => { console.error(err); process.exit(1); });
