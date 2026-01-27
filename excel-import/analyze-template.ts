/**
 * Excel Template Analyzer
 *
 * Analyzes a blank Excel template to help create tab configurations.
 * Shows structure of each tab so you can identify:
 * - Where question text appears
 * - Where answer columns are
 * - List table regions
 *
 * Run: npx tsx excel-import/analyze-template.ts <path-to-excel>
 */

import XLSX from 'xlsx';

async function analyzeTemplate(excelPath: string) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`ANALYZING: ${excelPath}`);
  console.log(`${'='.repeat(60)}\n`);

  const workbook = XLSX.readFile(excelPath);

  console.log(`Found ${workbook.SheetNames.length} tabs:`);
  workbook.SheetNames.forEach((name, i) => console.log(`  ${i + 1}. ${name}`));

  for (const sheetName of workbook.SheetNames) {
    console.log(`\n${'─'.repeat(60)}`);
    console.log(`TAB: ${sheetName}`);
    console.log(`${'─'.repeat(60)}`);

    const worksheet = workbook.Sheets[sheetName];
    const range = worksheet['!ref'];

    if (!range) {
      console.log('  (empty tab)');
      continue;
    }

    const decoded = XLSX.utils.decode_range(range);
    console.log(`  Range: ${range}`);
    console.log(`  Rows: ${decoded.e.r + 1}, Columns: ${decoded.e.c + 1}`);

    // Convert to 2D array
    const data: any[][] = XLSX.utils.sheet_to_json(worksheet, {
      header: 1,
      defval: ''
    });

    // Analyze first 20 rows to understand structure
    console.log(`\n  First 20 rows (showing non-empty cells):`);
    console.log(`  ${'─'.repeat(50)}`);

    for (let rowIdx = 0; rowIdx < Math.min(20, data.length); rowIdx++) {
      const row = data[rowIdx];
      const nonEmpty = row
        .map((cell: any, colIdx: number) => {
          if (cell === '' || cell === null || cell === undefined) return null;
          const colLetter = XLSX.utils.encode_col(colIdx);
          const cellText = String(cell).substring(0, 30);
          return `${colLetter}:"${cellText}"`;
        })
        .filter(Boolean);

      if (nonEmpty.length > 0) {
        console.log(`  Row ${rowIdx + 1}: ${nonEmpty.join(', ')}`);
      }
    }

    // Look for patterns
    console.log(`\n  Pattern Analysis:`);
    console.log(`  ${'─'.repeat(50)}`);

    // Find columns that look like question text (long strings)
    const columnStats: { [col: string]: { nonEmpty: number; avgLength: number } } = {};

    for (let colIdx = 0; colIdx <= decoded.e.c; colIdx++) {
      const colLetter = XLSX.utils.encode_col(colIdx);
      let nonEmptyCount = 0;
      let totalLength = 0;

      for (let rowIdx = 0; rowIdx < data.length; rowIdx++) {
        const cell = data[rowIdx]?.[colIdx];
        if (cell !== '' && cell !== null && cell !== undefined) {
          nonEmptyCount++;
          totalLength += String(cell).length;
        }
      }

      if (nonEmptyCount > 0) {
        columnStats[colLetter] = {
          nonEmpty: nonEmptyCount,
          avgLength: Math.round(totalLength / nonEmptyCount)
        };
      }
    }

    // Sort by average length (question columns tend to have longer text)
    const sortedCols = Object.entries(columnStats)
      .sort((a, b) => b[1].avgLength - a[1].avgLength);

    console.log(`  Columns by avg text length (likely question cols have longer text):`);
    sortedCols.slice(0, 8).forEach(([col, stats]) => {
      console.log(`    ${col}: ${stats.nonEmpty} cells, avg ${stats.avgLength} chars`);
    });

    // Find rows that look like section headers (short cells at start, then empty)
    const possibleHeaders: number[] = [];
    for (let rowIdx = 0; rowIdx < data.length; rowIdx++) {
      const row = data[rowIdx];
      const nonEmptyCells = row.filter((c: any) => c !== '' && c !== null && c !== undefined);

      // Section header pattern: 1-2 cells with text, rest empty
      if (nonEmptyCells.length >= 1 && nonEmptyCells.length <= 2) {
        const firstCell = String(row[0] || row[1] || '');
        // Check if it looks like a header (not a question)
        if (firstCell.length > 0 && firstCell.length < 50 && !firstCell.includes('?')) {
          possibleHeaders.push(rowIdx + 1);
        }
      }
    }

    if (possibleHeaders.length > 0 && possibleHeaders.length < 20) {
      console.log(`  Possible section header rows: ${possibleHeaders.slice(0, 10).join(', ')}`);
    }

    // Find list table regions (consecutive rows with similar structure)
    console.log(`\n  Suggested tab config:`);
    console.log(`  {`);
    console.log(`    tabName: "${sheetName}",`);
    console.log(`    questionColumn: "${sortedCols[0]?.[0] || 'B'}",  // VERIFY`);
    console.log(`    questionTextStartRow: 4,  // VERIFY`);
    console.log(`    answerColumn: "F",  // VERIFY`);
    console.log(`    answerStartRow: 4,  // VERIFY`);
    console.log(`    listTables: [],  // ADD IF NEEDED`);
    console.log(`    skipRows: [1, 2, 3]  // VERIFY`);
    console.log(`  }`);
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log(`Analysis complete. Update tab-configs.ts with findings.`);
  console.log(`${'='.repeat(60)}\n`);
}

// Main
const args = process.argv.slice(2);
if (args.length < 1) {
  console.log('Usage: npx tsx excel-import/analyze-template.ts <path-to-excel>');
  console.log('');
  console.log('Example:');
  console.log('  npx tsx excel-import/analyze-template.ts "/path/to/blank-template.xlsx"');
  process.exit(1);
}

analyzeTemplate(args[0]).catch(console.error);
