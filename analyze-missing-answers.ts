/**
 * Analyze why answers are missing
 */
import * as fs from 'fs';

const answers = JSON.parse(fs.readFileSync('fresh-import/bubble-export/answer.json', 'utf-8'));
const sheets = JSON.parse(fs.readFileSync('fresh-import/bubble-export/sheet.json', 'utf-8'));

// Get unique Bubble sheet IDs from answers
const sheetIdsInAnswers = new Set<string>();
for (const a of answers) {
  if (a.Sheet) {
    sheetIdsInAnswers.add(a.Sheet);
  }
}

// Get sheet IDs from our exported sheets
const exportedSheetIds = new Set<string>();
for (const s of sheets) {
  exportedSheetIds.add(s._id);
}

// Find sheets in answers that weren't exported
const missingSheets = new Set<string>();
for (const sheetId of sheetIdsInAnswers) {
  if (!exportedSheetIds.has(sheetId)) {
    missingSheets.add(sheetId);
  }
}

// Count answers for missing sheets
let answersForMissingSheets = 0;
for (const a of answers) {
  if (a.Sheet && missingSheets.has(a.Sheet)) {
    answersForMissingSheets++;
  }
}

console.log('Sheet Analysis:');
console.log('===============');
console.log('Unique sheets in answers:', sheetIdsInAnswers.size);
console.log('Sheets we exported:', exportedSheetIds.size);
console.log('Sheets in answers but not exported:', missingSheets.size);
console.log('Answers belonging to missing sheets:', answersForMissingSheets);
console.log('');

// Version grouping analysis
console.log('Version Grouping Analysis:');
console.log('==========================');

let hasVersionFatherSheet = 0;
let noVersionFatherSheet = 0;
const fatherSheets = new Set<string>();

for (const s of sheets) {
  if (s['Version Father Sheet']) {
    hasVersionFatherSheet++;
    fatherSheets.add(s['Version Father Sheet']);
  } else {
    noVersionFatherSheet++;
  }
}

// Group by Version Father Sheet to count composites
const composites = new Map<string, string[]>();
for (const s of sheets) {
  const root = s['Version Father Sheet'] || s._id;
  if (!composites.has(root)) {
    composites.set(root, []);
  }
  composites.get(root)!.push(s._id);
}

// Count how many have multiple versions
let singleVersion = 0;
let multipleVersions = 0;
let maxVersions = 0;
let totalVersionedSheets = 0;

for (const [root, versions] of composites) {
  if (versions.length === 1) {
    singleVersion++;
  } else {
    multipleVersions++;
    totalVersionedSheets += versions.length;
    if (versions.length > maxVersions) maxVersions = versions.length;
  }
}

console.log('Sheets with Version Father Sheet:', hasVersionFatherSheet);
console.log('Sheets without (root sheets):', noVersionFatherSheet);
console.log('Unique father sheet IDs:', fatherSheets.size);
console.log('');
console.log('Composite groups:', composites.size);
console.log('  - Single version products:', singleVersion);
console.log('  - Multi-version products:', multipleVersions);
console.log('  - Sheets in multi-version products:', totalVersionedSheets);
console.log('  - Max versions for one product:', maxVersions);
console.log('');

// Now check how many answers we should have based on unique (compositeSheet, question)
console.log('Answer Deduplication Analysis:');
console.log('==============================');

// Build Bubble sheet → composite sheet mapping
const bubbleToComposite = new Map<string, string>();
for (const s of sheets) {
  const compositeId = s['Version Father Sheet'] || s._id;
  bubbleToComposite.set(s._id, compositeId);
}

// Count unique (composite, question) combinations
const regularCompositeKeys = new Set<string>();
const listTableCompositeKeys = new Set<string>();

for (const a of answers) {
  if (!a.Sheet || !a['Parent Question']) continue;

  const compositeId = bubbleToComposite.get(a.Sheet);
  if (!compositeId) continue;

  if (a['List Table Row']) {
    // For list tables - we can't dedupe by row/col across versions since rows are different
    // So the unique key is really just (composite, question)
    const key = `${compositeId}|${a['Parent Question']}`;
    listTableCompositeKeys.add(key);
  } else {
    const key = `${compositeId}|${a['Parent Question']}`;
    regularCompositeKeys.add(key);
  }
}

console.log('Unique (composite_sheet, question) combinations:');
console.log('  Regular answers:', regularCompositeKeys.size);
console.log('  List table questions:', listTableCompositeKeys.size);
console.log('');
console.log('Supabase has:');
console.log('  Regular: 48,383');
console.log('  List table: 72,549');
console.log('');
console.log('Note: For list tables, we keep ALL rows from the latest version.');
console.log('So list table count depends on how many rows are in the latest version.');
