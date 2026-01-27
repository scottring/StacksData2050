import { supabase } from './src/migration/supabase-client.js';

/**
 * Renumber questions so that order_number restarts at 1 within each subsection
 *
 * This ensures questions display as:
 * 4.1.1, 4.1.2 (subsection 1)
 * 4.2.1 (subsection 2)
 * 4.3.1, 4.3.2, 4.3.3 (subsection 3)
 * etc.
 */

async function renumberQuestionsBySubsection() {
  console.log('=== Renumbering Questions by Subsection ===\n');

  // Get all questions, ordered by section, subsection, and current order
  const { data: questions } = await supabase
    .from('questions')
    .select('id, name, section_sort_number, subsection_sort_number, order_number, parent_subsection_id')
    .not('parent_subsection_id', 'is', null)
    .order('section_sort_number', { ascending: true })
    .order('subsection_sort_number', { ascending: true })
    .order('order_number', { ascending: true });

  if (!questions) {
    console.log('❌ No questions found');
    return;
  }

  console.log(`Processing ${questions.length} questions...\n`);

  // Group questions by subsection
  const questionsBySubsection = new Map<string, typeof questions>();

  questions.forEach(q => {
    const key = `${q.section_sort_number}.${q.subsection_sort_number}`;
    if (!questionsBySubsection.has(key)) {
      questionsBySubsection.set(key, []);
    }
    questionsBySubsection.get(key)!.push(q);
  });

  console.log(`Found ${questionsBySubsection.size} subsections with questions\n`);

  let updated = 0;
  let unchanged = 0;

  // Renumber questions within each subsection
  for (const [subsectionKey, subsectionQuestions] of questionsBySubsection) {
    console.log(`\nProcessing subsection ${subsectionKey} (${subsectionQuestions.length} questions):`);

    for (let i = 0; i < subsectionQuestions.length; i++) {
      const question = subsectionQuestions[i];
      const newOrderNumber = i + 1;

      if (question.order_number === newOrderNumber) {
        unchanged++;
        continue;
      }

      // Update the question
      const { error } = await supabase
        .from('questions')
        .update({ order_number: newOrderNumber })
        .eq('id', question.id);

      if (error) {
        console.log(`  ❌ Failed to update question ${question.id}: ${error.message}`);
      } else {
        console.log(`  ✓ ${subsectionKey}.${question.order_number} → ${subsectionKey}.${newOrderNumber}: ${question.name?.substring(0, 50)}...`);
        updated++;
      }
    }
  }

  console.log(`\n=== Summary ===`);
  console.log(`Updated: ${updated}`);
  console.log(`Unchanged: ${unchanged}`);
  console.log(`Total: ${questions.length}`);

  // Verify Food Contact section
  console.log('\n=== Verification: First 30 Food Contact Questions ===');
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

renumberQuestionsBySubsection().catch(console.error);
