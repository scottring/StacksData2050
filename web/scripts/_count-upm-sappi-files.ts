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

const UPM_BUBBLE = '1632528636558x671234562485387300';
const SAPPI_BUBBLE = '1632528459461x300654739299762200';

async function main() {
  // Count files for UPM customer answers
  const upmFiles = await bubbleGet('answer', [
    { key: 'File', constraint_type: 'is_not_empty' },
    { key: 'customer', constraint_type: 'equals', value: UPM_BUBBLE }
  ], 0, 1);
  const upmFileCount = upmFiles.response.remaining + (upmFiles.response.results?.length || 0);

  const upmSupport = await bubbleGet('answer', [
    { key: 'Support File', constraint_type: 'is_not_empty' },
    { key: 'customer', constraint_type: 'equals', value: UPM_BUBBLE }
  ], 0, 1);
  const upmSupportCount = upmSupport.response.remaining + (upmSupport.response.results?.length || 0);

  // Count files for Sappi customer answers
  const sappiFiles = await bubbleGet('answer', [
    { key: 'File', constraint_type: 'is_not_empty' },
    { key: 'customer', constraint_type: 'equals', value: SAPPI_BUBBLE }
  ], 0, 1);
  const sappiFileCount = sappiFiles.response.remaining + (sappiFiles.response.results?.length || 0);

  const sappiSupport = await bubbleGet('answer', [
    { key: 'Support File', constraint_type: 'is_not_empty' },
    { key: 'customer', constraint_type: 'equals', value: SAPPI_BUBBLE }
  ], 0, 1);
  const sappiSupportCount = sappiSupport.response.remaining + (sappiSupport.response.results?.length || 0);

  // Also check by Shareable with (some answers might use this for customer association)
  const upmShareable = await bubbleGet('answer', [
    { key: 'File', constraint_type: 'is_not_empty' },
    { key: 'Shareable with', constraint_type: 'contains', value: UPM_BUBBLE }
  ], 0, 1);
  const upmShareableCount = upmShareable.response.remaining + (upmShareable.response.results?.length || 0);

  console.log('=== Document counts for UPM + Sappi ===\n');
  console.log('UPM:');
  console.log(`  Files (by customer): ${upmFileCount}`);
  console.log(`  Support files (by customer): ${upmSupportCount}`);
  console.log(`  Files (by Shareable with): ${upmShareableCount}`);
  console.log(`  UPM total: ${upmFileCount + upmSupportCount}`);

  console.log('\nSappi:');
  console.log(`  Files (by customer): ${sappiFileCount}`);
  console.log(`  Support files (by customer): ${sappiSupportCount}`);
  console.log(`  Sappi total: ${sappiFileCount + sappiSupportCount}`);

  console.log(`\n=== Total UPM+Sappi documents: ${upmFileCount + upmSupportCount + sappiFileCount + sappiSupportCount} ===`);
}

main().catch(err => { console.error(err); process.exit(1); });
