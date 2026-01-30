import fetch from 'node-fetch';
import dotenv from 'dotenv';
import { supabase } from './src/migration/supabase-client.js';

dotenv.config();

const BUBBLE_API_URL = process.env.BUBBLE_API_URL!;
const BUBBLE_API_TOKEN = process.env.BUBBLE_API_TOKEN!;

async function checkBubbleQuestionOrder() {
  // Get questions from subsections 4.1, 4.2, and 4.3
  const { data: questions } = await supabase
    .from('questions')
    .select('bubble_id, name, order_number, subsection_sort_number, section_sort_number')
    .eq('section_sort_number', '4')
    .in('subsection_sort_number', [1, 2, 3])
    .order('subsection_sort_number', { ascending: true })
    .order('order_number', { ascending: true });

  if (!questions) {
    console.log('No questions found');
    return;
  }

  console.log('=== Checking Bubble Order Field ===\n');

  for (const q of questions.slice(0, 10)) {
    console.log(`\nCurrent in DB: 4.${q.subsection_sort_number}.${q.order_number}`);
    console.log(`Question: ${q.name?.substring(0, 60)}...`);

    const url = `${BUBBLE_API_URL}/api/1.1/obj/question/${q.bubble_id}`;
    const response = await fetch(url, {
      headers: { 'Authorization': `Bearer ${BUBBLE_API_TOKEN}` }
    });

    const data: any = await response.json();

    if (data.response) {
      console.log(`Bubble Order field: ${data.response.Order}`);
      console.log(`Bubble SUBSECTION SORT NUMBER: ${data.response['SUBSECTION SORT NUMBER']}`);
    }

    await new Promise(resolve => setTimeout(resolve, 200));
  }
}

checkBubbleQuestionOrder().catch(console.error);
