import { supabase } from './src/migration/supabase-client.js';
import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config();

const BUBBLE_API_URL = process.env.BUBBLE_API_URL!;
const BUBBLE_API_TOKEN = process.env.BUBBLE_API_TOKEN!;

async function checkListTableData() {
  const bubbleSheetId = '1636031591594x483952580354375700';
  const supabaseSheetId = 'd594b54f-6170-4280-af1c-098ceb83a094';

  // Question 3.1.2 - the list table
  const bubbleQuestionId = '1621985947370x515150303537922050';

  console.log('=== Checking List Table 3.1.2 ===\n');

  // Get question from Supabase
  const { data: question } = await supabase
    .from('questions')
    .select('id, name')
    .eq('bubble_id', bubbleQuestionId)
    .single();

  console.log('Question:', question?.name);
  console.log('');

  // Get answers from Bubble
  const bubbleUrl = `${BUBBLE_API_URL}/api/1.1/obj/answer?constraints=[{"key":"Sheet","constraint_type":"equals","value":"${bubbleSheetId}"},{"key":"Parent Question","constraint_type":"equals","value":"${bubbleQuestionId}"}]`;
  const bubbleResp = await fetch(bubbleUrl, {
    headers: { 'Authorization': `Bearer ${BUBBLE_API_TOKEN}` }
  });
  const bubbleData: any = await bubbleResp.json();
  const bubbleAnswers = bubbleData.response?.results || [];

  console.log(`Bubble answers: ${bubbleAnswers.length}\n`);

  // Show first 2 rows from Bubble
  const row1Answers = bubbleAnswers.filter((a: any) => a['List Table Row'] === bubbleAnswers[0]['List Table Row']);
  const row2Answers = bubbleAnswers.filter((a: any) => a['List Table Row'] === bubbleAnswers[5]?.['List Table Row']);

  console.log('=== BUBBLE DATA ===');
  console.log('\nRow 1 (Bronopol):');
  row1Answers.forEach((a: any) => {
    console.log(`  Column: ${a['List Table Column']}`);
    console.log(`  text: "${a.text || ''}"`);
    console.log('');
  });

  if (row2Answers.length > 0) {
    console.log('Row 2:');
    row2Answers.forEach((a: any) => {
      console.log(`  Column: ${a['List Table Column']}`);
      console.log(`  text: "${a.text || ''}"`);
      console.log('');
    });
  }

  // Get answers from Supabase
  const { data: supabaseAnswers } = await supabase
    .from('answers')
    .select('*')
    .eq('sheet_id', supabaseSheetId)
    .eq('parent_question_id', question?.id || '');

  console.log('\n=== SUPABASE DATA ===');
  console.log(`Total answers: ${supabaseAnswers?.length || 0}\n`);

  if (supabaseAnswers && supabaseAnswers.length > 0) {
    console.log('Sample answers:');
    supabaseAnswers.slice(0, 3).forEach((a, i) => {
      console.log(`${i + 1}. Row ID: ${a.list_table_row_id}`);
      console.log(`   Column ID: ${a.list_table_column_id}`);
      console.log(`   text_value: "${a.text_value || ''}"`);
      console.log('');
    });
  }
}

checkListTableData().catch(console.error);
