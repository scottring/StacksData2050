import { supabase } from './src/migration/supabase-client.js';
import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config();

const BUBBLE_API_URL = process.env.BUBBLE_API_URL!;
const BUBBLE_API_TOKEN = process.env.BUBBLE_API_TOKEN!;

/**
 * Investigate Choice ID Mapping Issues
 *
 * The verification found many answers with choice_id mismatches.
 * This script investigates WHY the choices don't match.
 */

async function fetchBubbleById<T>(endpoint: string, id: string): Promise<T | null> {
  const url = `${BUBBLE_API_URL}/api/1.1/obj/${endpoint}/${id}`;
  const response = await fetch(url, {
    headers: { 'Authorization': `Bearer ${BUBBLE_API_TOKEN}` }
  });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`Bubble API error: ${response.status}`);
  const data = await response.json() as { response: T };
  return data.response;
}

async function main() {
  console.log('🔍 INVESTIGATING CHOICE ID MAPPING ISSUES');
  console.log('='.repeat(80));

  // Get a few answers that have both choice_id in Supabase and a mismatch
  const { data: answersWithChoices } = await supabase
    .from('answers')
    .select(`
      id, bubble_id,
      choice_id,
      parent_question_id,
      sheet_id,
      choices!answers_choice_id_fkey (id, bubble_id, content),
      questions!answers_parent_question_id_fkey (id, bubble_id, name)
    `)
    .not('choice_id', 'is', null)
    .not('bubble_id', 'is', null)
    .limit(20);

  if (!answersWithChoices) {
    console.log('No answers with choices found');
    return;
  }

  console.log(`\nChecking ${answersWithChoices.length} answers with choice selections...\n`);

  let matchCount = 0;
  let mismatchCount = 0;

  for (const answer of answersWithChoices) {
    const bubbleAnswer = await fetchBubbleById<any>('answer', answer.bubble_id);
    if (!bubbleAnswer) {
      console.log(`Answer ${answer.bubble_id} not found in Bubble\n`);
      continue;
    }

    const choice = answer.choices as any;
    const question = answer.questions as any;

    console.log(`Answer: ${answer.bubble_id.substring(0, 20)}...`);
    console.log(`  Question: ${question?.name?.substring(0, 50)}...`);
    console.log(`  Supabase choice_id: ${answer.choice_id}`);
    console.log(`  Supabase choice bubble_id: ${choice?.bubble_id}`);
    console.log(`  Supabase choice content: "${choice?.content}"`);
    console.log(`  Bubble Choice field: ${bubbleAnswer.Choice}`);

    // Check if Supabase choice bubble_id matches Bubble's Choice field
    if (choice?.bubble_id === bubbleAnswer.Choice) {
      console.log(`  ✅ MATCH - Choice mapping is correct`);
      matchCount++;
    } else {
      console.log(`  ❌ MISMATCH!`);
      mismatchCount++;

      // What choice does Bubble think it should be?
      if (bubbleAnswer.Choice) {
        const bubbleChoice = await fetchBubbleById<any>('choice', bubbleAnswer.Choice);
        if (bubbleChoice) {
          console.log(`  Bubble expects choice: "${bubbleChoice.Content}"`);

          // Is there a Supabase choice with this bubble_id?
          const { data: correctChoice } = await supabase
            .from('choices')
            .select('id, bubble_id, content')
            .eq('bubble_id', bubbleAnswer.Choice)
            .single();

          if (correctChoice) {
            console.log(`  Correct Supabase choice exists: ${correctChoice.id} = "${correctChoice.content}"`);
            console.log(`  💡 Answer should have choice_id = ${correctChoice.id}`);
          } else {
            console.log(`  ⚠️  No Supabase choice found for Bubble choice ${bubbleAnswer.Choice}`);
          }
        }
      }
    }
    console.log('');

    await new Promise(r => setTimeout(r, 100));
  }

  console.log('='.repeat(80));
  console.log('SUMMARY:');
  console.log(`  Matches: ${matchCount}`);
  console.log(`  Mismatches: ${mismatchCount}`);
  console.log('='.repeat(80));

  if (mismatchCount > 0) {
    console.log('\n⚠️  DIAGNOSIS: Choice ID mapping has issues.');
    console.log('The answers are storing incorrect choice_id values.');
    console.log('This causes "Yes" to show as "No" because the wrong choice is selected.');
    console.log('\nPossible causes:');
    console.log('1. Choice IDs were mapped incorrectly during answer migration');
    console.log('2. Choices were remigrated after answers, getting new UUIDs');
    console.log('3. Answer import used text matching instead of ID mapping');
  }
}

main().catch(console.error);
