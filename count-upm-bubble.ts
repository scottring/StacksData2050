import * as dotenv from 'dotenv';
dotenv.config();

const BUBBLE_API_URL = process.env.BUBBLE_API_URL!;
const BUBBLE_API_TOKEN = process.env.BUBBLE_API_TOKEN!;
const UPM_BUBBLE_ID = '1632528636558x671234562485387300';

async function fetchBubble(cursor = 0, limit = 100) {
  const url = BUBBLE_API_URL + '/api/1.1/obj/sheet?cursor=' + cursor + '&limit=' + limit;
  const response = await fetch(url, {
    headers: { 'Authorization': 'Bearer ' + BUBBLE_API_TOKEN }
  });
  const data = await response.json();
  return { results: data.response.results, remaining: data.response.remaining };
}

async function count() {
  let cursor = 0;
  let remaining = 1;
  
  const upmSheetNames = new Set<string>();
  let totalUpmSheets = 0;
  
  while (remaining > 0) {
    const { results, remaining: r } = await fetchBubble(cursor, 100);
    remaining = r;
    cursor += results.length;
    
    for (const sheet of results) {
      if (sheet['Original Requestor assoc'] === UPM_BUBBLE_ID) {
        totalUpmSheets++;
        const name = (sheet.Name || '').toLowerCase().trim();
        upmSheetNames.add(name);
      }
    }
    
    process.stdout.write('\rProcessed: ' + cursor + ' sheets...');
  }
  
  console.log('\n');
  console.log('Total Bubble sheets with UPM as requestor:', totalUpmSheets);
  console.log('Unique sheet NAMES for UPM:', upmSheetNames.size);
  
  // Show some sample names
  console.log('\nSample UPM sheet names (first 20):');
  let i = 0;
  for (const name of upmSheetNames) {
    if (i++ >= 20) break;
    console.log('  ' + name);
  }
}

count();
