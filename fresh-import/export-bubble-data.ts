/**
 * Export Bubble Data to JSON Files
 *
 * Uses Bubble MCP to export all necessary tables to local JSON files.
 * This creates a permanent backup and allows importing without hitting Bubble API.
 *
 * Tables to export:
 * - company (132 records)
 * - user (336 records)
 * - section (23 records)
 * - subsection (84 records)
 * - tag (26 records)
 * - question (227 records)
 * - choice (691 records)
 * - listtablecolumn (765 records)
 * - sheet (1658 records)
 * - answer (368,134 records) <-- the big one
 *
 * Run: npx tsx fresh-import/export-bubble-data.ts
 * Output: fresh-import/bubble-export/*.json
 */

import * as fs from 'fs';
import * as path from 'path';

// This script is meant to be run manually with output piped
// For automated export, we need to call the MCP tools directly

const EXPORT_DIR = path.join(__dirname, 'bubble-export');

// Tables to export with their expected counts
const TABLES = [
  { name: 'company', expectedCount: 132 },
  { name: 'user', expectedCount: 336 },
  { name: 'section', expectedCount: 23 },
  { name: 'subsection', expectedCount: 84 },
  { name: 'tag', expectedCount: 26 },
  { name: 'question', expectedCount: 227 },
  { name: 'choice', expectedCount: 691 },
  { name: 'listtablecolumn', expectedCount: 765 },
  { name: 'sheet', expectedCount: 1658 },
  { name: 'answer', expectedCount: 368134 },
];

async function main() {
  console.log('===============================================');
  console.log('   Export Bubble Data to JSON');
  console.log('===============================================\n');
  console.log('This script provides the structure for exporting.');
  console.log('Due to MCP limitations, run exports manually:\n');

  // Create export directory
  if (!fs.existsSync(EXPORT_DIR)) {
    fs.mkdirSync(EXPORT_DIR, { recursive: true });
  }

  console.log('Tables to export:');
  for (const table of TABLES) {
    console.log(`  - ${table.name}: ~${table.expectedCount} records`);
  }

  console.log('\nExport commands (run in Claude with MCP):');
  console.log('----------------------------------------');

  for (const table of TABLES) {
    console.log(`\nmcp__bubble__bubble_list dataType="${table.name}" limit=100 cursor=0`);
    console.log(`  -> Save to: ${EXPORT_DIR}/${table.name}.json`);
  }

  console.log('\n\nFor large tables like "answer", you will need to paginate:');
  console.log('1. Start with cursor=0, limit=100');
  console.log('2. Check "remaining" in response');
  console.log('3. Increment cursor by result count');
  console.log('4. Repeat until remaining=0');
  console.log('5. Combine all results into single JSON file');
}

main().catch(console.error);
