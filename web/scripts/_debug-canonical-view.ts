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

  // 1. Fetch answers from sheet_answers_display
  const { data: answers, error: aErr } = await supabase
    .from('sheet_answers_display')
    .select('*')
    .eq('sheet_id', sheetId);
  console.log('Answers from sheet_answers_display:', answers?.length, aErr?.message);

  if (!answers || answers.length === 0) {
    // Try directly from answers table
    const { data: directAnswers, error: dErr } = await supabase
      .from('answers')
      .select('id, parent_sheet_id')
      .eq('parent_sheet_id', sheetId)
      .limit(5);
    console.log('Direct answers (parent_sheet_id):', directAnswers?.length, dErr?.message);
    directAnswers?.forEach(a => console.log('  ', a.id));
    return;
  }

  const answerIds = answers.map(a => a.id);
  console.log('Sample answer IDs:', answerIds.slice(0, 3));

  // 2. Fetch canonical_answer_links
  const allLinks: any[] = [];
  for (let i = 0; i < answerIds.length; i += 50) {
    const batch = answerIds.slice(i, i + 50);
    const { data, error } = await supabase
      .from('canonical_answer_links')
      .select('answer_id, canonical_parameter_id')
      .in('answer_id', batch);
    if (error) console.log('Links error:', error.message);
    if (data) allLinks.push(...data);
  }
  console.log('\nCanonical links found:', allLinks.length);
  if (allLinks.length > 0) {
    console.log('Sample link:', allLinks[0]);
    const uniqueParams = new Set(allLinks.map(l => l.canonical_parameter_id));
    console.log('Unique param IDs referenced:', uniqueParams.size);
  }

  // 3. Fetch canonical parameters
  const { data: params, error: pErr } = await supabase
    .from('canonical_parameters')
    .select('id, code, name, section, subsection, section_order, subsection_order, parameter_order')
    .order('section_order')
    .order('subsection_order')
    .order('parameter_order');
  console.log('\nCanonical parameters:', params?.length, pErr?.message);
  if (params && params.length > 0) {
    console.log('Sample param:', params[0]);
    // Check if link param IDs match
    const paramIds = new Set(params.map(p => p.id));
    const linkParamIds = new Set(allLinks.map(l => l.canonical_parameter_id));
    let matched = 0;
    linkParamIds.forEach(id => { if (paramIds.has(id)) matched++; });
    console.log(`Link param IDs that match canonical_parameters: ${matched}/${linkParamIds.size}`);
  }

  // 4. Check what the view uses for sheet_id
  const { data: viewSample } = await supabase
    .from('sheet_answers_display')
    .select('id, sheet_id')
    .eq('sheet_id', sheetId)
    .limit(3);
  console.log('\nView sheet_id field:', viewSample?.map(v => ({ id: v.id, sheet_id: v.sheet_id })));
}

main().catch(err => { console.error(err); process.exit(1); });
