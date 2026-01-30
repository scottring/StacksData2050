/**
 * Analyze the Biocides tab structure to understand question repetition
 */
import XLSX from 'xlsx';

const excelPath = "/Users/scottkaufman/Dropbox/02. Stacks Data Master Folder/200.Stacks Data/40-49 Software Development/41 Testing/41.01 Excel Upload/2023 Excel upload/20230113 FennoCide BZ26 - P&P ViS HQ v2.1.xlsx";

const workbook = XLSX.readFile(excelPath);
const worksheet = workbook.Sheets['Biocides'];

const data: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

console.log('Biocides tab structure:\n');

for (let i = 0; i < Math.min(data.length, 50); i++) {
  const row = data[i];
  const questionText = String(row[0] || '').trim();
  const answerVal = String(row[3] || '').trim(); // Column D

  if (questionText || answerVal) {
    const preview = questionText.substring(0, 70);
    console.log(`Row ${i + 1}: ${preview}`);
    if (answerVal) {
      console.log(`        Answer (D): ${answerVal.substring(0, 40)}`);
    }
  }
}
