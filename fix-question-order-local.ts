/**
 * Fix question ordering by deriving from the hierarchy:
 * - Section order_number
 * - Subsection order_number within section
 * - Question order_number within subsection
 */
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'http://127.0.0.1:54321',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU'
);

async function main() {
  // Get sections with their order
  const { data: sections } = await supabase
    .from('sections')
    .select('id, name, order_number')
    .order('order_number');

  console.log('Sections:', sections?.length);

  // Build section order map
  const sectionOrderMap = new Map<string, number>();
  sections?.forEach(s => {
    sectionOrderMap.set(s.id, s.order_number || 0);
  });

  // Get subsections with their order and parent section
  const { data: subsections } = await supabase
    .from('subsections')
    .select('id, name, section_id, order_number')
    .order('order_number');

  console.log('Subsections:', subsections?.length);

  // Build subsection order map (order within section)
  const subsectionOrderMap = new Map<string, number>();
  const subsectionSectionMap = new Map<string, string>();
  subsections?.forEach(sub => {
    subsectionOrderMap.set(sub.id, sub.order_number || 0);
    if (sub.section_id) {
      subsectionSectionMap.set(sub.id, sub.section_id);
    }
  });

  // Get all questions
  const { data: questions } = await supabase
    .from('questions')
    .select('id, name, subsection_id, order_number');

  console.log('Questions:', questions?.length);

  // Calculate correct sort numbers for each question
  let updates = 0;
  const batchSize = 50;
  const updateBatch: { id: string; section_sort_number: number; subsection_sort_number: number }[] = [];

  for (const q of questions || []) {
    if (!q.subsection_id) continue;

    const sectionId = subsectionSectionMap.get(q.subsection_id);
    if (!sectionId) continue;

    const sectionSort = sectionOrderMap.get(sectionId) || 0;
    const subsectionSort = subsectionOrderMap.get(q.subsection_id) || 0;

    updateBatch.push({
      id: q.id,
      section_sort_number: sectionSort,
      subsection_sort_number: subsectionSort
    });

    if (updateBatch.length >= batchSize) {
      // Update in batch
      for (const update of updateBatch) {
        await supabase
          .from('questions')
          .update({
            section_sort_number: update.section_sort_number,
            subsection_sort_number: update.subsection_sort_number
          })
          .eq('id', update.id);
        updates++;
      }
      updateBatch.length = 0;
      console.log(`Updated ${updates} questions...`);
    }
  }

  // Final batch
  for (const update of updateBatch) {
    await supabase
      .from('questions')
      .update({
        section_sort_number: update.section_sort_number,
        subsection_sort_number: update.subsection_sort_number
      })
      .eq('id', update.id);
    updates++;
  }

  console.log(`\nTotal updated: ${updates} questions`);

  // Verify
  const { data: sample } = await supabase
    .from('questions')
    .select('name, section_sort_number, subsection_sort_number, order_number')
    .order('section_sort_number')
    .order('subsection_sort_number')
    .order('order_number')
    .limit(15);

  console.log('\nSample after fix:');
  sample?.forEach(q => {
    const num = `${q.section_sort_number}.${q.subsection_sort_number}.${q.order_number}`;
    console.log(`  ${num.padEnd(10)} ${(q.name || 'N/A').substring(0, 60)}`);
  });
}

main();
