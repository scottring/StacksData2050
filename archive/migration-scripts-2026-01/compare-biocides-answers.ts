import fetch from 'node-fetch';
import dotenv from 'dotenv';
import { supabase } from './src/migration/supabase-client.js';

dotenv.config();

const BUBBLE_API_URL = process.env.BUBBLE_API_URL!;
const BUBBLE_API_TOKEN = process.env.BUBBLE_API_TOKEN!;

async function compareAnswers() {
  const bubbleSheetId = '1636031591594x483952580354375700';
  const supabaseSheetId = 'd594b54f-6170-4280-af1c-098ceb83a094';

  // Get questions in Biocides section (3.1)
  const { data: questions } = await supabase
    .from('questions')
    .select('id, bubble_id, name, order_number')
    .eq('section_sort_number', '3')
    .eq('subsection_sort_number', '1')
    .order('order_number');

  console.log('Checking answers for Biocides section (3.1):\n');

  for (const q of questions!) {
    console.log(`Question 3.1.${q.order_number}: ${q.name?.substring(0, 60)}...`);

    // Get Bubble answers
    const bubbleUrl = `${BUBBLE_API_URL}/api/1.1/obj/answer?constraints=[{"key":"Sheet","constraint_type":"equals","value":"${bubbleSheetId}"},{"key":"Parent Question","constraint_type":"equals","value":"${q.bubble_id}"}]`;
    const bubbleResp = await fetch(bubbleUrl, { headers: { 'Authorization': `Bearer ${BUBBLE_API_TOKEN}` } });
    const bubbleData: any = await bubbleResp.json();
    const bubbleAnswerCount = bubbleData.response?.results?.length || 0;

    // Get Supabase answers
    const { data: supabaseAnswers } = await supabase
      .from('answers')
      .select('*')
      .eq('sheet_id', supabaseSheetId)
      .eq('parent_question_id', q.id);
    const supabaseAnswerCount = supabaseAnswers?.length || 0;

    console.log(`  Bubble: ${bubbleAnswerCount} answers`);
    console.log(`  Supabase: ${supabaseAnswerCount} answers`);

    if (bubbleAnswerCount !== supabaseAnswerCount) {
      console.log(`  ⚠️  MISMATCH!`);

      if (bubbleAnswerCount > 0 && supabaseAnswerCount === 0) {
        console.log(`  📋 Bubble answer values:`);
        bubbleData.response.results.forEach((a: any) => {
          console.log(`     - ${a.text || a.Text || a.Choice || '(other type)'}`);
        });
      }
    }
    console.log('');

    await new Promise(resolve => setTimeout(resolve, 200));
  }
}

compareAnswers().catch(console.error);
