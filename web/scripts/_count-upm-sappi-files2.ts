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

// Company Bubble IDs (from "Shareable with" field)
const UPM_BUBBLE = '1632528636558x671234562485387300';
const SAPPI_BUBBLE = '1632528459461x300654739299762200';

async function main() {
  // Use "Shareable with" contains for customer filtering
  // UPM Files
  const upmFiles = await bubbleGet('answer', [
    { key: 'File', constraint_type: 'is_not_empty' },
    { key: 'Shareable with', constraint_type: 'contains', value: UPM_BUBBLE }
  ], 0, 1);
  const upmFileCount = upmFiles.response.remaining + (upmFiles.response.results?.length || 0);

  // UPM Support Files
  const upmSupport = await bubbleGet('answer', [
    { key: 'Support File', constraint_type: 'is_not_empty' },
    { key: 'Shareable with', constraint_type: 'contains', value: UPM_BUBBLE }
  ], 0, 1);
  const upmSupportCount = upmSupport.response.remaining + (upmSupport.response.results?.length || 0);

  // Sappi Files
  const sappiFiles = await bubbleGet('answer', [
    { key: 'File', constraint_type: 'is_not_empty' },
    { key: 'Shareable with', constraint_type: 'contains', value: SAPPI_BUBBLE }
  ], 0, 1);
  const sappiFileCount = sappiFiles.response.remaining + (sappiFiles.response.results?.length || 0);

  // Sappi Support Files
  const sappiSupport = await bubbleGet('answer', [
    { key: 'Support File', constraint_type: 'is_not_empty' },
    { key: 'Shareable with', constraint_type: 'contains', value: SAPPI_BUBBLE }
  ], 0, 1);
  const sappiSupportCount = sappiSupport.response.remaining + (sappiSupport.response.results?.length || 0);

  console.log('=== Document Counts (UPM + Sappi) ===\n');
  console.log(`UPM files: ${upmFileCount}`);
  console.log(`UPM support files: ${upmSupportCount}`);
  console.log(`Sappi files: ${sappiFileCount}`);
  console.log(`Sappi support files: ${sappiSupportCount}`);
  console.log(`\nTotal: ${upmFileCount + upmSupportCount + sappiFileCount + sappiSupportCount}`);

  // Get a few samples with file URLs for inspection
  console.log('\n=== Sample UPM file URLs ===');
  const upmSample = await bubbleGet('answer', [
    { key: 'File', constraint_type: 'is_not_empty' },
    { key: 'Shareable with', constraint_type: 'contains', value: UPM_BUBBLE }
  ], 0, 3);
  for (const a of upmSample.response.results || []) {
    console.log(`  File: ${a.File}`);
    if (a['Support File']) console.log(`  Support: ${a['Support File']}`);
    console.log(`  Answer ID: ${a._id}`);
    console.log();
  }
}

main().catch(err => { console.error(err); process.exit(1); });
