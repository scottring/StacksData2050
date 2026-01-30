import { supabase } from './src/migration/supabase-client.js';
import fetch from 'node-fetch';
import dotenv from 'dotenv';
import { getSupabaseId } from './src/migration/id-mapper.js';

dotenv.config();

const BUBBLE_API_URL = process.env.BUBBLE_API_URL!;
const BUBBLE_API_TOKEN = process.env.BUBBLE_API_TOKEN!;

async function debug() {
  const bubbleSheetId = '1636031591594x483952580354375700';
  const bubbleQuestionId = '1621985947370x515150303537922050';

  // Get one answer
  const url = `${BUBBLE_API_URL}/api/1.1/obj/answer?constraints=[{"key":"Sheet","constraint_type":"equals","value":"${bubbleSheetId}"},{"key":"Parent Question","constraint_type":"equals","value":"${bubbleQuestionId}"}]&limit=1`;
  const response = await fetch(url, {
    headers: { 'Authorization': `Bearer ${BUBBLE_API_TOKEN}` }
  });
  const data: any = await response.json();
  const answer = data.response?.results[0];

  console.log('Sample list table answer from Bubble:');
  console.log('Parent Question:', answer['Parent Question']);
  console.log('List Table Row:', answer['List Table Row']);
  console.log('List Table Column:', answer['List Table Column']);
  console.log('text:', answer.text);
  console.log('');

  // Try to map the IDs
  console.log('Mapping IDs...');
  const parentQuestionId = await getSupabaseId(answer['Parent Question'], 'question');
  const listTableRowId = await getSupabaseId(answer['List Table Row'], 'list_table_row');
  const listTableColumnId = await getSupabaseId(answer['List Table Column'], 'list_table_column');

  console.log('parent_question_id:', parentQuestionId);
  console.log('list_table_row_id:', listTableRowId);
  console.log('list_table_column_id:', listTableColumnId);
  console.log('');

  // Validate each
  console.log('Validating FKs...');

  if (parentQuestionId) {
    const { data: q } = await supabase
      .from('questions')
      .select('id, name')
      .eq('id', parentQuestionId)
      .maybeSingle();
    console.log('Question exists:', q ? `✓ "${q.name}"` : '❌ NOT FOUND');
  }

  if (listTableRowId) {
    const { data: r } = await supabase
      .from('list_table_rows')
      .select('id, name')
      .eq('id', listTableRowId)
      .maybeSingle();
    console.log('Row exists:', r ? `✓ "${r.name}"` : '❌ NOT FOUND');
  }

  if (listTableColumnId) {
    const { data: c } = await supabase
      .from('list_table_columns')
      .select('id, name')
      .eq('id', listTableColumnId)
      .maybeSingle();
    console.log('Column exists:', c ? `✓ "${c.name}"` : '❌ NOT FOUND');
  }
}

debug().catch(console.error);
