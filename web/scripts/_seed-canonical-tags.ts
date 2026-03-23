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

const HQ21_TAG_ID = 'a3fbb37e-cace-4aae-85c1-a2571e539e81';

async function main() {
  // 1. Link HQ2.1 tag to all canonical parameters
  console.log('Linking HQ2.1 tag to canonical parameters...');
  const { data: params } = await supabase
    .from('canonical_parameters')
    .select('id, code')
    .eq('is_active', true)
    .order('sort_order');

  if (!params?.length) {
    console.error('No canonical parameters found!');
    process.exit(1);
  }

  const rows = params.map(p => ({
    tag_id: HQ21_TAG_ID,
    canonical_parameter_id: p.id,
  }));

  const { error: insertErr } = await supabase
    .from('canonical_parameter_tags')
    .upsert(rows, { onConflict: 'tag_id,canonical_parameter_id' });

  if (insertErr) {
    console.error('Error inserting canonical_parameter_tags:', insertErr.message);
  } else {
    console.log(`  Linked ${rows.length} parameters to HQ2.1 tag`);
  }

  // 2. Populate legacy_question_id from normalization_mappings
  console.log('\nPopulating legacy_question_id...');
  const { data: mappings } = await supabase
    .from('normalization_mappings')
    .select('canonical_parameter_id, legacy_question_id')
    .eq('status', 'accepted');

  let updated = 0;
  for (const m of mappings || []) {
    if (!m.legacy_question_id) continue;
    const { error } = await supabase
      .from('canonical_parameters')
      .update({ legacy_question_id: m.legacy_question_id })
      .eq('id', m.canonical_parameter_id)
      .is('legacy_question_id', null);

    if (!error) updated++;
  }
  console.log(`  Updated ${updated} params from normalization_mappings`);

  // 3. Fallback: populate from canonical_answer_links → answers
  const { data: remaining } = await supabase
    .from('canonical_parameters')
    .select('id, code')
    .is('legacy_question_id', null)
    .eq('is_active', true);

  if (remaining?.length) {
    console.log(`\n  ${remaining.length} params still missing legacy_question_id, trying answer links...`);
    for (const param of remaining) {
      const { data: links } = await supabase
        .from('canonical_answer_links')
        .select('answer_id')
        .eq('canonical_parameter_id', param.id)
        .limit(1);

      if (links?.[0]) {
        const { data: answer } = await supabase
          .from('answers')
          .select('question_id')
          .eq('id', links[0].answer_id)
          .single();

        if (answer?.question_id) {
          await supabase
            .from('canonical_parameters')
            .update({ legacy_question_id: answer.question_id })
            .eq('id', param.id);
          updated++;
        }
      }
    }
  }

  // Verify
  const { data: verify } = await supabase
    .from('canonical_parameters')
    .select('code, legacy_question_id')
    .eq('is_active', true)
    .order('sort_order');

  const withLegacy = verify?.filter(p => p.legacy_question_id).length || 0;
  const withoutLegacy = verify?.filter(p => !p.legacy_question_id).length || 0;

  console.log(`\nResults:`);
  console.log(`  With legacy_question_id: ${withLegacy}`);
  console.log(`  Without: ${withoutLegacy}`);

  if (withoutLegacy > 0) {
    console.log('\n  Missing legacy_question_id:');
    verify?.filter(p => !p.legacy_question_id).forEach(p => {
      console.log(`    ${p.code}`);
    });
  }

  // Verify tag links
  const { count } = await supabase
    .from('canonical_parameter_tags')
    .select('*', { count: 'exact', head: true })
    .eq('tag_id', HQ21_TAG_ID);

  console.log(`\nHQ2.1 tag links: ${count}`);
}

main().catch(err => { console.error(err); process.exit(1); });
