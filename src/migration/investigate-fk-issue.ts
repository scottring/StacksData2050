import { supabase } from './supabase-client.js';
import { createLogger } from './utils/logger.js';
import * as fs from 'fs';

const logger = createLogger('FKInvestigation');

async function investigate() {
  logger.info('=== INVESTIGATING FOREIGN KEY ISSUE ===');
  logger.info('');

  // Read sample from JSON
  const fileContent = fs.readFileSync('/Users/scottkaufman/Downloads/export_All-Answers-modified--_2025-12-27_08-33-43.json', 'utf-8');
  const data = JSON.parse(fileContent);
  const answers = Array.isArray(data) ? data : data.results || [];

  // Get first 5 answers with non-empty Company field
  const samplesWithCompany = answers.filter((a: any) => a.Company && a.Company.trim() !== '').slice(0, 5);

  logger.info('Sample answers from JSON export:');
  for (const sample of samplesWithCompany) {
    logger.info(`  Company: "${sample.Company}"`);
    logger.info(`  Parent Question: "${sample['Parent Question']}"`);
    logger.info(`  Sheet: "${sample.Sheet}"`);
    logger.info(`  unique id: ${sample['unique id']}`);
    logger.info('');
  }

  // Check if these companies exist in ID mapping
  logger.info('=== CHECKING ID MAPPINGS ===');
  logger.info('');

  const companyName = samplesWithCompany[0].Company;
  logger.info(`Looking for company: "${companyName}"`);

  // Check in _migration_id_map
  const { data: companyMapping, error: mappingError } = await supabase
    .from('_migration_id_map')
    .select('*')
    .eq('entity_type', 'company')
    .eq('bubble_id', companyName);

  if (mappingError) {
    logger.error('Error querying mapping:', mappingError);
  } else {
    logger.info(`Found ${companyMapping?.length || 0} mapping(s) for company "${companyName}"`);
    if (companyMapping && companyMapping.length > 0) {
      logger.info(`Mapping: ${JSON.stringify(companyMapping[0])}`);
    }
  }

  // Check in companies table directly
  const { data: company, error: companyError } = await supabase
    .from('companies')
    .select('id, bubble_id, company_name')
    .eq('company_name', companyName);

  if (companyError) {
    logger.error('Error querying companies:', companyError);
  } else {
    logger.info(`Found ${company?.length || 0} company record(s) with name "${companyName}"`);
    if (company && company.length > 0) {
      logger.info(`Company: ${JSON.stringify(company[0])}`);

      // Check if mapping exists for this bubble_id
      const { data: correctMapping } = await supabase
        .from('_migration_id_map')
        .select('*')
        .eq('entity_type', 'company')
        .eq('bubble_id', company[0].bubble_id);

      logger.info(`Mapping exists for bubble_id "${company[0].bubble_id}": ${correctMapping && correctMapping.length > 0 ? 'YES' : 'NO'}`);
      if (correctMapping && correctMapping.length > 0) {
        logger.info(`Correct mapping: ${JSON.stringify(correctMapping[0])}`);
      }
    }
  }

  logger.info('');
  logger.info('=== ANALYSIS ===');
  logger.info('The JSON export uses company NAME as the value, not bubble_id!');
  logger.info('This is the root cause - we need to look up by name, not by bubble_id.');
  logger.info('');

  // Check question mapping similarly
  const questionText = samplesWithCompany[0]['Parent Question'];
  if (questionText && questionText.trim()) {
    logger.info(`Checking question: "${questionText}"`);

    const { data: question } = await supabase
      .from('questions')
      .select('id, bubble_id, question_text')
      .ilike('question_text', `%${questionText.trim()}%`);

    logger.info(`Found ${question?.length || 0} question(s) matching text`);
    if (question && question.length > 0) {
      logger.info(`Question: ${JSON.stringify(question[0])}`);
    }
  }
}

investigate().catch(console.error);
