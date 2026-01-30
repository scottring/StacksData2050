/**
 * Analyze answer ratios in raw Bubble data
 */
import * as fs from 'fs';

const answers = JSON.parse(fs.readFileSync('fresh-import/bubble-export/answer.json', 'utf-8'));

// Count unique (sheet, question) combinations for regular answers
const regularKeys = new Set<string>();
const listTableKeys = new Set<string>();

let missingSheet = 0;
let missingQuestion = 0;

for (const a of answers) {
  if (!a.Sheet) {
    missingSheet++;
    continue;
  }
  if (!a['Parent Question']) {
    missingQuestion++;
    continue;
  }

  if (a['List Table Row']) {
    // For list tables: unique (sheet, question, row, column)
    const key = `${a.Sheet}|${a['Parent Question']}|${a['List Table Row']}|${a['List Table Column'] || ''}`;
    listTableKeys.add(key);
  } else {
    // For regular: unique (sheet, question)
    const key = `${a.Sheet}|${a['Parent Question']}`;
    regularKeys.add(key);
  }
}

console.log('Raw Bubble Data Analysis:');
console.log('=========================');
console.log('Total answers:', answers.length);
console.log('Missing Sheet field:', missingSheet);
console.log('Missing Parent Question:', missingQuestion);
console.log('');
console.log('Unique combinations (what we SHOULD have after deduplication):');
console.log('  Regular (sheet, question):', regularKeys.size);
console.log('  List table (sheet, question, row, column):', listTableKeys.size);
console.log('  Total expected:', regularKeys.size + listTableKeys.size);
console.log('');
console.log('What Supabase has:');
console.log('  Regular: 48,383');
console.log('  List table: 72,549');
console.log('  Total: 120,932');
console.log('');
console.log('Difference:');
console.log('  Regular: missing', regularKeys.size - 48383, 'answers');
console.log('  List table: missing', listTableKeys.size - 72549, 'answers');
