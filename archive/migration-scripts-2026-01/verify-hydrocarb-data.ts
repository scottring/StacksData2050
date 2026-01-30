import { supabase } from './src/migration/supabase-client.js';
import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config();

const BUBBLE_API_URL = process.env.BUBBLE_API_URL!;
const BUBBLE_API_TOKEN = process.env.BUBBLE_API_TOKEN!;

async function verifyHydrocarb() {
  console.log('=== Verifying Hydrocarb Sheet Data ===\n');

  const bubbleSheetId = '1636031591594x483952580354375700';
  const supabaseSheetId = 'd594b54f-6170-4280-af1c-098ceb83a094';

  // Check Biocides section (3.1) - previously had issues
  console.log('Checking Biocides section (3.1)...\n');

  const { data: biocidesQuestions } = await supabase
    .from('questions')
    .select('id, bubble_id, name, order_number')
    .eq('section_sort_number', '3')
    .eq('subsection_sort_number', '1')
    .order('order_number');

  for (const q of biocidesQuestions || []) {
    // Get Supabase answers
    const { data: supabaseAnswers } = await supabase
      .from('answers')
      .select('*')
      .eq('sheet_id', supabaseSheetId)
      .eq('parent_question_id', q.id);

    // Get Bubble answers
    const bubbleUrl = `${BUBBLE_API_URL}/api/1.1/obj/answer?constraints=[{"key":"Sheet","constraint_type":"equals","value":"${bubbleSheetId}"},{"key":"Parent Question","constraint_type":"equals","value":"${q.bubble_id}"}]`;
    const bubbleResp = await fetch(bubbleUrl, {
      headers: { 'Authorization': `Bearer ${BUBBLE_API_TOKEN}` }
    });
    const bubbleData: any = await bubbleResp.json();
    const bubbleAnswers = bubbleData.response?.results || [];

    const match = supabaseAnswers?.length === bubbleAnswers.length;
    const icon = match ? '✓' : '❌';

    console.log(`${icon} Q 3.1.${q.order_number}: ${q.name?.substring(0, 50)}...`);
    console.log(`   Bubble: ${bubbleAnswers.length} | Supabase: ${supabaseAnswers?.length || 0}`);

    if (!match && bubbleAnswers.length > 0) {
      console.log(`   Sample Bubble values:`, bubbleAnswers.slice(0, 2).map((a: any) => a.text || a.Choice || '(other)'));
    }

    await new Promise(resolve => setTimeout(resolve, 200));
  }

  // Overall counts
  console.log('\n=== Overall Counts ===');
  const { count: totalSupabase } = await supabase
    .from('answers')
    .select('*', { count: 'exact', head: true })
    .eq('sheet_id', supabaseSheetId);

  console.log(`Total answers in Supabase: ${totalSupabase}`);
  console.log(`Expected from Bubble: 100`);

  if (totalSupabase === 100) {
    console.log('\n✅ Hydrocarb sheet verified successfully!');
  }
}

verifyHydrocarb().catch(console.error);
