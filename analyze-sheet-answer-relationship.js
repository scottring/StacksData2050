import { supabase } from './src/migration/supabase-client.js';
import * as fs from 'fs';

async function analyze() {
  console.log('Analyzing sheet-answer relationship...\n');

  // Get a sample company
  const { data: company } = await supabase
    .from('companies')
    .select('id, name')
    .limit(1)
    .single();

  console.log(`Sample company: ${company.name}`);
  console.log(`Company ID: ${company.id}\n`);

  // Count sheets for this company
  const { count: sheetCount } = await supabase
    .from('sheets')
    .select('*', { count: 'exact', head: true })
    .eq('company_id', company.id);

  console.log(`Sheets for this company: ${sheetCount}\n`);

  // Get those sheets
  const { data: sheets } = await supabase
    .from('sheets')
    .select('id, name, bubble_id, created_at')
    .eq('company_id', company.id)
    .order('created_at', { ascending: true })
    .limit(5);

  console.log('Sample sheets for this company:');
  for (const sheet of sheets || []) {
    console.log(`  - ${sheet.name} (${new Date(sheet.created_at).toLocaleDateString()})`);
    console.log(`    Bubble ID: ${sheet.bubble_id}`);
  }

  console.log('\nChecking JSON for Sheet field...');

  // Read sample from JSON
  const fileContent = fs.readFileSync('/Users/scottkaufman/Downloads/export_All-Answers-modified--_2025-12-27_08-33-43.json', 'utf-8');
  const data = JSON.parse(fileContent);
  const answers = Array.isArray(data) ? data : data.results || [];

  // Find answers for this company
  const companyAnswers = answers.filter(a => a.Company?.toLowerCase() === company.name.toLowerCase()).slice(0, 10);

  console.log(`\nSample answers for ${company.name}:`);
  for (const answer of companyAnswers) {
    console.log(`  Sheet: "${answer.Sheet}"`);
    console.log(`  Answer_name: ${answer.Answer_name}`);
    console.log(`  Parent Question: ${answer['Parent Question']?.substring(0, 50)}...`);
    console.log('');
  }

  console.log('\nCONCLUSION:');
  console.log('If Sheet field is always empty, we may need to:');
  console.log('1. Create a default sheet per company, OR');
  console.log('2. Link answers to sheets through another relationship, OR');
  console.log('3. Accept that sheet_id will remain NULL for now');
}

analyze().catch(console.error);
