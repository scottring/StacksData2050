import { supabase } from './src/migration/supabase-client.js';
import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config();

const BUBBLE_API_URL = process.env.BUBBLE_API_URL!;
const BUBBLE_API_TOKEN = process.env.BUBBLE_API_TOKEN!;

async function checkMissingChoices() {
  console.log('=== Checking Missing Choice IDs ===\n');

  const bubbleChoiceIds = [
    '1626116356221x965580956008185900',
    '1621986578624x618774764314951700',
    '1621986546899x672780509975412700',
    '1626116261396x997921081706938400',
    '1626116336068x639907107643326500',
    '1626116225202x646358702612021200'
  ];

  for (const bubbleId of bubbleChoiceIds) {
    console.log(`\nBubble Choice ID: ${bubbleId.substring(0, 20)}...`);

    // Check ID mapping
    const { data: mapping } = await supabase
      .from('_migration_id_map')
      .select('*')
      .eq('bubble_id', bubbleId)
      .eq('entity_type', 'choice')
      .maybeSingle();

    if (mapping) {
      console.log(`  Mapped to: ${mapping.supabase_id.substring(0, 20)}...`);

      // Check if choice exists
      const { data: choice } = await supabase
        .from('choices')
        .select('*')
        .eq('id', mapping.supabase_id)
        .maybeSingle();

      if (choice) {
        console.log(`  ✓ Choice exists: "${choice.name}"`);
      } else {
        console.log(`  ❌ Choice MISSING from choices table`);
      }
    } else {
      console.log(`  ❌ Not found in ID map - never migrated`);
    }

    // Get from Bubble
    const url = `${BUBBLE_API_URL}/api/1.1/obj/choice/${bubbleId}`;
    const response = await fetch(url, {
      headers: { 'Authorization': `Bearer ${BUBBLE_API_TOKEN}` }
    });
    const data: any = await response.json();

    if (data.response) {
      console.log(`  Bubble name: "${data.response.Name}"`);
      console.log(`  Bubble question: ${data.response['Parent Question']?.substring(0, 20)}...`);
    }
  }

  // Check list table rows issue
  console.log('\n\n=== Checking List Table Rows (Q 3.1.2) ===\n');

  const questionBubbleId = '1626099764934x686568732993708000';
  const sheetBubbleId = '1636031591594x483952580354375700';

  // Get Bubble answers for this list table question
  const bubbleUrl = `${BUBBLE_API_URL}/api/1.1/obj/answer?constraints=[{"key":"Sheet","constraint_type":"equals","value":"${sheetBubbleId}"},{"key":"Parent Question","constraint_type":"equals","value":"${questionBubbleId}"}]`;
  const bubbleResp = await fetch(bubbleUrl, {
    headers: { 'Authorization': `Bearer ${BUBBLE_API_TOKEN}` }
  });
  const bubbleData: any = await bubbleResp.json();
  const bubbleAnswers = bubbleData.response?.results || [];

  console.log(`Bubble answers: ${bubbleAnswers.length}`);

  // Group by row
  const rowSet = new Set();
  bubbleAnswers.forEach((a: any) => {
    if (a['List Table Row']) rowSet.add(a['List Table Row']);
  });

  console.log(`Unique rows: ${rowSet.size}`);
  console.log('Row IDs:', Array.from(rowSet).map((id: any) => id.substring(0, 20) + '...'));

  // Check if these rows exist in Supabase
  for (const rowId of Array.from(rowSet)) {
    const { data: mapping } = await supabase
      .from('_migration_id_map')
      .select('*')
      .eq('bubble_id', rowId as string)
      .eq('entity_type', 'list_table_row')
      .maybeSingle();

    if (mapping) {
      const { data: row } = await supabase
        .from('list_table_rows')
        .select('*')
        .eq('id', mapping.supabase_id)
        .maybeSingle();

      const status = row ? '✓' : '❌';
      console.log(`${status} Row ${(rowId as string).substring(0, 20)}... -> ${row ? 'exists' : 'MISSING'}`);
    } else {
      console.log(`❌ Row ${(rowId as string).substring(0, 20)}... -> not mapped`);
    }
  }
}

checkMissingChoices().catch(console.error);
