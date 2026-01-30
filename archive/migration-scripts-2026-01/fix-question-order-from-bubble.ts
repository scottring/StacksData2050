import { supabase } from './src/migration/supabase-client.js';
import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config();

const BUBBLE_BASE_URL = process.env.BUBBLE_API_URL!;
const BUBBLE_API_TOKEN = process.env.BUBBLE_API_TOKEN!;

async function fixQuestionOrderFromBubble() {
  console.log('=== Fixing Question order_number from Bubble ===\n');

  // Get all Food Contact questions
  const { data: questions } = await supabase
    .from('questions')
    .select('id, name, bubble_id, order_number, section_sort_number, subsection_sort_number, parent_subsection_id')
    .eq('section_sort_number', '4')
    .not('bubble_id', 'is', null)
    .order('subsection_sort_number', { ascending: true })
    .order('order_number', { ascending: true });

  if (!questions) {
    console.log('❌ No questions found');
    return;
  }

  console.log(`Processing ${questions.length} questions...\n`);

  let fixed = 0;
  let errors = 0;
  let notFound = 0;

  for (const question of questions) {
    try {
      // Fetch from Bubble to get the correct Order field
      const url = `${BUBBLE_BASE_URL}/api/1.1/obj/question/${question.bubble_id}`;
      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${BUBBLE_API_TOKEN}` }
      });

      const data: any = await response.json();

      if (!data.response) {
        console.log(`❌ Question not found in Bubble: ${question.bubble_id}`);
        notFound++;
        continue;
      }

      const bubbleQuestion = data.response;
      const bubbleOrder = bubbleQuestion.Order;

      // Check if Order exists in Bubble
      if (bubbleOrder === undefined || bubbleOrder === null) {
        console.log(`⚠️  Question has no Order in Bubble: ${question.name?.substring(0, 60)}...`);
        notFound++;
        continue;
      }

      // Update if different
      if (question.order_number !== bubbleOrder) {
        const { error } = await supabase
          .from('questions')
          .update({ order_number: bubbleOrder })
          .eq('id', question.id);

        if (error) {
          console.log(`❌ Failed to update question ${question.id}: ${error.message}`);
          errors++;
        } else {
          console.log(`✓ 4.${question.subsection_sort_number}.${question.order_number} → 4.${question.subsection_sort_number}.${bubbleOrder}: ${question.name?.substring(0, 60)}`);
          fixed++;
        }
      }

      // Rate limiting delay
      await new Promise(resolve => setTimeout(resolve, 100));

    } catch (err) {
      console.log(`❌ Error processing question ${question.id}: ${err}`);
      errors++;
    }
  }

  console.log(`\n=== Summary ===`);
  console.log(`Fixed: ${fixed}`);
  console.log(`Not found/No Order: ${notFound}`);
  console.log(`Errors: ${errors}`);

  // Show first 30 questions after fix
  console.log('\n=== First 30 Questions After Fix ===');
  const { data: verifyQuestions } = await supabase
    .from('questions')
    .select('section_sort_number, subsection_sort_number, order_number, name')
    .eq('section_sort_number', '4')
    .order('subsection_sort_number', { ascending: true })
    .order('order_number', { ascending: true })
    .limit(30);

  verifyQuestions?.forEach(q => {
    console.log(`${q.section_sort_number}.${q.subsection_sort_number}.${q.order_number} - ${q.name?.substring(0, 70)}`);
  });
}

fixQuestionOrderFromBubble().catch(console.error);
