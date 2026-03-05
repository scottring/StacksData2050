import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const BUBBLE_BASE_URL = process.env.BUBBLE_API_URL || 'https://app.stacksdata.com/version-live';
const BUBBLE_API_TOKEN = process.env.BUBBLE_API_TOKEN as string;

async function bubbleGet(endpoint: string, cursor = 0, limit = 10) {
  const url = `${BUBBLE_BASE_URL}/api/1.1/obj/${endpoint}?cursor=${cursor}&limit=${limit}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${BUBBLE_API_TOKEN}` },
  });
  if (!res.ok) throw new Error(`${res.status}: ${await res.text()}`);
  return res.json();
}

async function main() {
  // Try more Bubble type names for file storage
  const typeNames = [
    'uploaded_file', 'upload', 'file_upload', 'sds', 'SDS',
    'certificate', 'declaration', 'support_file', 'supportfile',
    'answer_file', 'sheet_file', 'compliance_document',
    'uploaded_document', 'user_file',
    // Bubble convention: PascalCase or snake_case
    'UploadedFile', 'FileUpload', 'SupportFile', 'AnswerFile',
    'SheetFile', 'ComplianceDocument', 'AnswerDocument'
  ];

  for (const t of typeNames) {
    try {
      const res = await bubbleGet(t, 0, 1);
      const count = (res.response.remaining || 0) + (res.response.results?.length || 0);
      console.log(`${t}: ${count} records`);
      if (res.response.results?.length > 0) {
        console.log(`  Fields: ${Object.keys(res.response.results[0]).join(', ')}`);
        console.log(`  Sample:`, JSON.stringify(res.response.results[0], null, 2).slice(0, 500));
      }
    } catch (e: any) {
      // skip 404s silently
      if (!e.message.startsWith('404')) {
        console.log(`${t}: ${e.message.slice(0, 60)}`);
      }
    }
  }

  // Also check answers with file fields by fetching more answer fields
  console.log('\n=== Answer with constraint for file field ===');
  try {
    // In Bubble, files are sometimes stored as a URL in a text field
    // Let's look for answers that have data suggesting documents
    const res = await bubbleGet('answer', 0, 5);
    console.log('All answer fields (full sample):');
    if (res.response.results?.[0]) {
      console.log(JSON.stringify(res.response.results[0], null, 2));
    }
  } catch (e: any) {
    console.log('Error:', e.message);
  }

  // Check for "list_table_row" type which might hold file references
  console.log('\n=== list_table_row ===');
  try {
    const res = await bubbleGet('list_table_row', 0, 2);
    const count = (res.response.remaining || 0) + (res.response.results?.length || 0);
    console.log(`Count: ${count}`);
    if (res.response.results?.[0]) {
      const keys = Object.keys(res.response.results[0]);
      const fileFields = keys.filter(k =>
        k.toLowerCase().includes('file') ||
        k.toLowerCase().includes('doc') ||
        k.toLowerCase().includes('url') ||
        k.toLowerCase().includes('attach')
      );
      console.log(`File fields: ${fileFields.join(', ') || 'none'}`);
      console.log(`All fields: ${keys.join(', ')}`);
    }
  } catch (e: any) {
    console.log('Error:', e.message.slice(0, 80));
  }
}

main().catch(err => { console.error(err); process.exit(1); });
