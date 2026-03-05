import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const BUBBLE_BASE_URL = process.env.BUBBLE_API_URL || 'https://app.stacksdata.com/version-live';
const BUBBLE_API_TOKEN = process.env.BUBBLE_API_TOKEN as string;

async function bubbleGet(endpoint: string, constraints?: any[], cursor = 0, limit = 100) {
  let url = `${BUBBLE_BASE_URL}/api/1.1/obj/${endpoint}?cursor=${cursor}&limit=${limit}`;
  if (constraints) {
    url += `&constraints=${encodeURIComponent(JSON.stringify(constraints))}`;
  }
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${BUBBLE_API_TOKEN}` },
  });
  if (!res.ok) throw new Error(`${res.status}: ${await res.text()}`);
  return res.json();
}

async function main() {
  console.log('=== Checking Bubble answers for file attachments ===\n');

  // First get a broader sample to see file fields
  const sampleRes = await bubbleGet('answer', [], 0, 5);
  const sampleAnswer = sampleRes.response.results[0];
  console.log('All answer fields:', Object.keys(sampleAnswer).join(', '));

  // Check if File or Support File fields exist on answers
  // Bubble might return them only when they have values
  // Let's search for answers where File is not empty
  const withFileRes = await bubbleGet('answer', [
    { key: 'File', constraint_type: 'is_not_empty' }
  ], 0, 5);
  const fileCount = withFileRes.response.remaining + (withFileRes.response.results?.length || 0);
  console.log(`\nAnswers with File field: ${fileCount}`);
  if (withFileRes.response.results?.length > 0) {
    console.log('Sample answer with file:');
    console.log(JSON.stringify(withFileRes.response.results[0], null, 2));
  }

  // Check Support File
  const withSupportRes = await bubbleGet('answer', [
    { key: 'Support File', constraint_type: 'is_not_empty' }
  ], 0, 5);
  const supportCount = withSupportRes.response.remaining + (withSupportRes.response.results?.length || 0);
  console.log(`\nAnswers with Support File field: ${supportCount}`);
  if (withSupportRes.response.results?.length > 0) {
    console.log('Sample answer with support file:');
    console.log(JSON.stringify(withSupportRes.response.results[0], null, 2));
  }

  // Check if we can filter by customer (UPM/Sappi)
  // First find UPM and Sappi in Bubble
  console.log('\n=== Looking for UPM and Sappi in Bubble ===');

  const upmRes = await bubbleGet('company', [
    { key: 'Name', constraint_type: 'equals', value: 'UPM' }
  ], 0, 5);
  if (upmRes.response.results?.length > 0) {
    console.log('UPM Bubble ID:', upmRes.response.results[0]._id);
  }

  const sappiRes = await bubbleGet('company', [
    { key: 'Name', constraint_type: 'equals', value: 'Sappi' }
  ], 0, 5);
  if (sappiRes.response.results?.length > 0) {
    console.log('Sappi Bubble ID:', sappiRes.response.results[0]._id);
  }

  // Total answers
  const totalRes = await bubbleGet('answer', [], 0, 1);
  console.log(`\nTotal Bubble answers: ${totalRes.response.remaining + 1}`);
  console.log(`Answers with files: ${fileCount}`);
  console.log(`Answers with support files: ${supportCount}`);
  console.log(`Total documents to migrate: ${fileCount + supportCount}`);
}

main().catch(err => { console.error(err); process.exit(1); });
