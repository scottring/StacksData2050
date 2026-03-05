import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Load stacks/.env which has Bubble credentials
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const BUBBLE_BASE_URL = process.env.BUBBLE_API_URL || 'https://app.stacksdata.com/version-live';
const BUBBLE_API_TOKEN = process.env.BUBBLE_API_TOKEN as string;

async function bubbleGet(endpoint: string, cursor = 0, limit = 10) {
  const url = `${BUBBLE_BASE_URL}/api/1.1/obj/${endpoint}?cursor=${cursor}&limit=${limit}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${BUBBLE_API_TOKEN}` },
  });
  if (!res.ok) {
    throw new Error(`Bubble API ${res.status}: ${await res.text()}`);
  }
  return res.json();
}

async function main() {
  console.log(`Bubble API: ${BUBBLE_BASE_URL}`);
  console.log(`Token: ${BUBBLE_API_TOKEN?.slice(0, 10)}...`);

  // Check what data types exist that might contain documents
  // Common Bubble patterns: "answer" with file fields, or a separate "document" type

  // 1. Check the answer type for file fields
  console.log('\n=== Checking Bubble "answer" type (first 3) ===');
  try {
    const answerRes = await bubbleGet('answer', 0, 3);
    console.log(`Remaining: ${answerRes.response.remaining}`);
    if (answerRes.response.results?.length > 0) {
      const sample = answerRes.response.results[0];
      const keys = Object.keys(sample);
      console.log(`Fields: ${keys.join(', ')}`);
      // Look for file-related fields
      const fileFields = keys.filter(k =>
        k.toLowerCase().includes('file') ||
        k.toLowerCase().includes('doc') ||
        k.toLowerCase().includes('attach') ||
        k.toLowerCase().includes('upload') ||
        k.toLowerCase().includes('image')
      );
      console.log(`File-related fields: ${fileFields.join(', ') || 'none'}`);

      // Show values for file fields
      for (const f of fileFields) {
        console.log(`  ${f}: ${JSON.stringify(sample[f])}`);
      }
    }
  } catch (e: any) {
    console.log('Error:', e.message);
  }

  // 2. Check for a "document" or "file" type
  for (const typeName of ['document', 'file', 'attachment', 'Document', 'File', 'Attachment', 'answer_document', 'AnswerDocument']) {
    try {
      const res = await bubbleGet(typeName, 0, 1);
      console.log(`\n=== Bubble "${typeName}" type ===`);
      console.log(`Count: ${res.response.remaining + (res.response.results?.length || 0)}`);
      if (res.response.results?.length > 0) {
        console.log(`Fields: ${Object.keys(res.response.results[0]).join(', ')}`);
        console.log(`Sample:`, JSON.stringify(res.response.results[0], null, 2));
      }
    } catch (e: any) {
      // Type doesn't exist - that's fine
      if (!e.message.includes('404')) {
        console.log(`${typeName}: ${e.message.slice(0, 80)}`);
      }
    }
  }

  // 3. Check "sheet" type for document fields
  console.log('\n=== Checking Bubble "sheet" type for doc fields ===');
  try {
    const sheetRes = await bubbleGet('sheet', 0, 1);
    if (sheetRes.response.results?.length > 0) {
      const sample = sheetRes.response.results[0];
      const keys = Object.keys(sample);
      const fileFields = keys.filter(k =>
        k.toLowerCase().includes('file') ||
        k.toLowerCase().includes('doc') ||
        k.toLowerCase().includes('attach')
      );
      console.log(`File-related fields: ${fileFields.join(', ') || 'none'}`);
      for (const f of fileFields) {
        console.log(`  ${f}: ${JSON.stringify(sample[f])}`);
      }
    }
  } catch (e: any) {
    console.log('Error:', e.message);
  }

  // 4. Check "question" type for document fields
  console.log('\n=== Checking Bubble "question" type for doc fields ===');
  try {
    const qRes = await bubbleGet('question', 0, 1);
    if (qRes.response.results?.length > 0) {
      const sample = qRes.response.results[0];
      const keys = Object.keys(sample);
      const fileFields = keys.filter(k =>
        k.toLowerCase().includes('file') ||
        k.toLowerCase().includes('doc') ||
        k.toLowerCase().includes('attach')
      );
      console.log(`File-related fields: ${fileFields.join(', ') || 'none'}`);
      for (const f of fileFields) {
        console.log(`  ${f}: ${JSON.stringify(sample[f])}`);
      }
    }
  } catch (e: any) {
    console.log('Error:', e.message);
  }
}

main().catch(err => { console.error(err); process.exit(1); });
