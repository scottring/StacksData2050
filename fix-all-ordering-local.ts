/**
 * Fix ALL ordering - sections, subsections, and questions
 * Handles undefined SUBSECTION SORT NUMBER by calculating from subsection order
 */
import * as fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'http://127.0.0.1:54321',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU'
);

async function main() {
  // Load Bubble data
  const bubbleQuestions = JSON.parse(fs.readFileSync('fresh-import/bubble-export/question.json', 'utf-8'));
  const bubbleSubsections = JSON.parse(fs.readFileSync('fresh-import/bubble-export/subsection.json', 'utf-8'));
  const bubbleSections = JSON.parse(fs.readFileSync('fresh-import/bubble-export/section.json', 'utf-8'));

  // Get DB data with bubble_id mappings
  const { data: dbQuestions } = await supabase.from('questions').select('id, bubble_id');

  // Build Bubble ID -> DB ID map
  const questionBubbleToDb = new Map(dbQuestions?.map(q => [q.bubble_id, q.id]) || []);

  console.log('Bubble questions:', bubbleQuestions.length);
  console.log('DB questions with bubble_id:', questionBubbleToDb.size);

  // ==========================================
  // Step 1: Calculate subsection order within each section
  // ==========================================
  console.log('\n=== Calculating Subsection Orders ===');

  // Group subsections by parent section
  const subsectionsBySection = new Map<string, any[]>();
  for (const bsub of bubbleSubsections) {
    if (!bsub.Parent_Section) continue;
    if (!subsectionsBySection.has(bsub.Parent_Section)) {
      subsectionsBySection.set(bsub.Parent_Section, []);
    }
    subsectionsBySection.get(bsub.Parent_Section)!.push({
      bubbleId: bsub._id,
      name: bsub.Name,
      order: bsub.Order,
      createdDate: new Date(bsub['Created Date']),
      hasQuestions: (bsub.listOfQuestions?.length || 0) > 0
    });
  }

  // Calculate order for each subsection within its section
  const subsectionOrderMap = new Map<string, number>(); // bubble subsection ID -> calculated order

  for (const [sectionId, subs] of subsectionsBySection) {
    // Filter to only subsections with questions
    const withQuestions = subs.filter(s => s.hasQuestions);

    // Sort by Order if exists, then by Created Date
    withQuestions.sort((a, b) => {
      if (a.order !== undefined && b.order !== undefined) {
        return a.order - b.order;
      }
      if (a.order !== undefined) return -1;
      if (b.order !== undefined) return 1;
      return a.createdDate.getTime() - b.createdDate.getTime();
    });

    // Assign sequential order numbers starting at 1
    withQuestions.forEach((sub, i) => {
      subsectionOrderMap.set(sub.bubbleId, i + 1);
    });

    // For subsections without questions, assign 999
    subs.filter(s => !s.hasQuestions).forEach(sub => {
      subsectionOrderMap.set(sub.bubbleId, 999);
    });
  }

  // Show Product Information subsection ordering
  const productInfoSection = bubbleSections.find((s: any) => s.Name === 'Product Information');
  if (productInfoSection) {
    console.log('\n  Product Information subsections:');
    const subs = subsectionsBySection.get(productInfoSection._id) || [];
    subs.filter(s => s.hasQuestions).sort((a, b) => {
      const orderA = subsectionOrderMap.get(a.bubbleId) || 999;
      const orderB = subsectionOrderMap.get(b.bubbleId) || 999;
      return orderA - orderB;
    }).forEach(s => {
      const order = subsectionOrderMap.get(s.bubbleId);
      console.log(`    ${order}. ${s.name}`);
    });
  }

  // ==========================================
  // Step 2: Fix Question Order
  // ==========================================
  console.log('\n=== Fixing Question Order ===');

  let updated = 0;
  let skipped = 0;
  let errors = 0;

  for (const bq of bubbleQuestions) {
    const dbId = questionBubbleToDb.get(bq._id);
    if (!dbId) {
      skipped++;
      continue;
    }

    // Section sort - use Bubble value or default to 999
    let sectionSort = bq['SECTION SORT NUMBER'];
    if (sectionSort === undefined || sectionSort === null) {
      sectionSort = 999;
    }
    // Convert floats to integers
    sectionSort = Math.round(sectionSort);

    // Subsection sort - use Bubble value if defined, otherwise calculate from subsection
    let subsectionSort = bq['SUBSECTION SORT NUMBER'];
    if (subsectionSort === undefined || subsectionSort === null) {
      // Look up from our calculated subsection order
      const subsectionId = bq['Parent Subsection'];
      if (subsectionId) {
        subsectionSort = subsectionOrderMap.get(subsectionId) || 999;
      } else {
        subsectionSort = 999;
      }
    }
    // Convert floats to integers
    subsectionSort = Math.round(subsectionSort);

    // Question order - use Bubble value or default to 999
    let questionOrder = bq.Order;
    if (questionOrder === undefined || questionOrder === null) {
      questionOrder = 999;
    }
    // Convert floats to integers
    questionOrder = Math.round(questionOrder);

    const { error } = await supabase.from('questions').update({
      section_sort_number: sectionSort,
      subsection_sort_number: subsectionSort,
      order_number: questionOrder
    }).eq('id', dbId);

    if (error) {
      console.error('Error updating question:', dbId, error.message);
      errors++;
    } else {
      updated++;
    }
  }

  console.log(`Updated ${updated} questions`);
  console.log(`Skipped ${skipped} (not found in DB)`);
  console.log(`Errors: ${errors}`);

  // ==========================================
  // Verification
  // ==========================================
  console.log('\n=== Verification ===');
  const { data: sample } = await supabase
    .from('questions')
    .select(`
      name,
      section_sort_number,
      subsection_sort_number,
      order_number,
      subsections!inner(name, sections!inner(name))
    `)
    .order('section_sort_number')
    .order('subsection_sort_number')
    .order('order_number')
    .limit(35);

  console.log('\nFirst 35 questions in order:');
  sample?.forEach((q: any) => {
    const num = `${q.section_sort_number}.${q.subsection_sort_number}.${q.order_number}`;
    const sectionName = q.subsections?.sections?.name?.substring(0, 15) || 'N/A';
    const subName = q.subsections?.name?.substring(0, 20) || 'N/A';
    const qName = (q.name || 'N/A').substring(0, 40);
    console.log(`  ${num.padEnd(10)} [${sectionName.padEnd(15)}] [${subName.padEnd(20)}] ${qName}`);
  });

  // Check the Product section specifically
  console.log('\n=== Product Information Questions ===');
  const { data: productQuestions } = await supabase
    .from('questions')
    .select(`
      name,
      section_sort_number,
      subsection_sort_number,
      order_number,
      subsections!inner(name, sections!inner(name))
    `)
    .eq('subsections.sections.name', 'Product Information')
    .order('section_sort_number')
    .order('subsection_sort_number')
    .order('order_number');

  productQuestions?.forEach((q: any) => {
    const num = `${q.section_sort_number}.${q.subsection_sort_number}.${q.order_number}`;
    const subName = q.subsections?.name?.substring(0, 20) || 'N/A';
    const qName = (q.name || 'N/A').substring(0, 45);
    console.log(`  ${num.padEnd(10)} [${subName.padEnd(20)}] ${qName}`);
  });
}

main();
