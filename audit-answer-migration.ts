import { supabase } from './src/migration/supabase-client.js';

/**
 * Audit answer migration by sampling sheets and checking answer counts
 */

async function auditAnswerMigration() {
  console.log('=== Answer Migration Audit ===\n');

  // Get a sample of sheets
  const { data: sheets } = await supabase
    .from('sheets')
    .select('id, name, bubble_id')
    .not('bubble_id', 'is', null)
    .limit(50);

  if (!sheets) {
    console.log('No sheets found');
    return;
  }

  console.log(`Checking ${sheets.length} sheets...\n`);

  let totalSheets = 0;
  let sheetsWithAnswers = 0;
  let sheetsWithoutAnswers = 0;
  let totalAnswerCount = 0;

  for (const sheet of sheets) {
    const { data: answers, count } = await supabase
      .from('answers')
      .select('*', { count: 'exact', head: true })
      .eq('sheet_id', sheet.id);

    totalSheets++;
    totalAnswerCount += count || 0;

    if (count && count > 0) {
      sheetsWithAnswers++;
      if (count < 10) {
        console.log(`⚠️  Sheet "${sheet.name}" has only ${count} answers (ID: ${sheet.id.substring(0, 8)}...)`);
      }
    } else {
      sheetsWithoutAnswers++;
      console.log(`❌ Sheet "${sheet.name}" has 0 answers (ID: ${sheet.id.substring(0, 8)}...)`);
    }
  }

  console.log('\n=== Summary ===');
  console.log(`Total sheets checked: ${totalSheets}`);
  console.log(`Sheets with answers: ${sheetsWithAnswers}`);
  console.log(`Sheets with 0 answers: ${sheetsWithoutAnswers}`);
  console.log(`Total answers across sample: ${totalAnswerCount}`);
  console.log(`Average answers per sheet: ${(totalAnswerCount / totalSheets).toFixed(1)}`);

  // Check total answer count in database
  const { count: totalAnswers } = await supabase
    .from('answers')
    .select('*', { count: 'exact', head: true });

  console.log(`\nTotal answers in database: ${totalAnswers}`);
  console.log(`Expected from migration: 367,251`);

  if (totalAnswers && totalAnswers < 367251) {
    console.log(`\n⚠️  Missing ${367251 - totalAnswers} answers!`);
  }
}

auditAnswerMigration().catch(console.error);
