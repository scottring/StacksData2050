import { supabase } from './src/migration/supabase-client.js';
import * as fs from 'fs';

async function createSheetArtifact() {
  console.log('Creating sheet artifact from real database data...\n');

  // Get a sheet that has many answers
  const { data: sampleAnswer } = await supabase
    .from('answers')
    .select('sheet_id')
    .not('sheet_id', 'is', null)
    .limit(1)
    .single();

  const { data: sheet } = await supabase
    .from('sheets')
    .select('id, name, company_id, created_at')
    .eq('id', sampleAnswer!.sheet_id)
    .single();

  console.log(`Loading sheet: ${sheet!.name} (ID: ${sheet!.id})`);

  // Get company info
  const { data: company } = await supabase
    .from('companies')
    .select('name')
    .eq('id', sheet!.company_id)
    .single();

  console.log(`Company: ${company?.name}`);

  // Get all answers for this sheet with questions
  console.log('Loading answers...');
  const { data: answers, error: answersError } = await supabase
    .from('answers')
    .select(`
      id,
      answer_name,
      text_value,
      text_area_value,
      number_value,
      boolean_value,
      date_value,
      parent_question_id,
      choice_id,
      created_at
    `)
    .eq('sheet_id', sheet!.id)
    .order('created_at', { ascending: true });

  if (answersError) {
    console.log('Answers error:', JSON.stringify(answersError, null, 2));
    throw new Error('Failed to load answers');
  }
  console.log(`Answers loaded: ${answers?.length || 0}`);

  // Get unique questions
  const questionIds = [...new Set(answers?.map(a => a.parent_question_id).filter(Boolean))];
  console.log(`Unique questions: ${questionIds.length}`);
  const { data: questions, error: questionsError } = await supabase
    .from('questions')
    .select('id, name, question_type')
    .in('id', questionIds);

  if (questionsError) {
    console.log('Questions error:', JSON.stringify(questionsError, null, 2));
  }
  console.log(`Questions loaded: ${questions?.length || 0}`);

  // Build artifact
  const artifact = {
    sheet: {
      name: sheet!.name,
      company: company?.name || 'Unknown',
      created: new Date(sheet!.created_at).toLocaleDateString(),
      total_answers: answers?.length || 0,
      unique_questions: questionIds.length
    },
    questions_and_answers: questions?.map(q => {
      const questionAnswers = answers?.filter(a => a.parent_question_id === q.id) || [];
      return {
        question: q.name,
        type: q.question_type,
        answer_count: questionAnswers.length,
        sample_answers: questionAnswers.slice(0, 5).map(a => ({
          name: a.answer_name,
          value: a.text_value || a.text_area_value || a.number_value || a.boolean_value || a.date_value || '[no value]',
          created: new Date(a.created_at).toLocaleDateString()
        }))
      };
    }) || []
  };

  // Save as JSON
  const outputPath = '/tmp/sheet-artifact.json';
  fs.writeFileSync(outputPath, JSON.stringify(artifact, null, 2));

  console.log('╔════════════════════════════════════════════════════════╗');
  console.log('║              📄 SHEET ARTIFACT                        ║');
  console.log('╚════════════════════════════════════════════════════════╝\n');
  console.log(`📋 Sheet: ${artifact.sheet.name}`);
  console.log(`🏢 Company: ${artifact.sheet.company}`);
  console.log(`📅 Created: ${artifact.sheet.created}`);
  console.log(`📊 Total Answers: ${artifact.sheet.total_answers}`);
  console.log(`❓ Unique Questions: ${artifact.sheet.unique_questions}\n`);

  console.log('═══════════════════════════════════════════════════════');
  console.log('Questions & Answers (showing first 10):');
  console.log('═══════════════════════════════════════════════════════\n');

  artifact.questions_and_answers.slice(0, 10).forEach((qa, i) => {
    console.log(`${i + 1}. ${qa.question}`);
    console.log(`   Type: ${qa.type || 'unknown'}`);
    console.log(`   Total Answers: ${qa.answer_count}`);
    if (qa.sample_answers.length > 0) {
      console.log(`   Sample Values:`);
      qa.sample_answers.forEach(a => {
        const displayValue = String(a.value).substring(0, 80);
        console.log(`     • ${displayValue}`);
      });
    }
    console.log('');
  });

  console.log('═══════════════════════════════════════════════════════');
  console.log(`✅ Full artifact with ${artifact.questions_and_answers.length} questions saved to:`);
  console.log(`   ${outputPath}\n`);
  console.log('📖 View complete JSON with:');
  console.log(`   cat ${outputPath}`);
  console.log('═══════════════════════════════════════════════════════');
}

createSheetArtifact().catch(console.error);
