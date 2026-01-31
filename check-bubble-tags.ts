import * as dotenv from 'dotenv';
dotenv.config();

const BUBBLE_API_URL = process.env.BUBBLE_API_URL!;
const BUBBLE_API_TOKEN = process.env.BUBBLE_API_TOKEN!;

async function fetchBubble(entityType: string, cursor = 0, limit = 100) {
  const url = new URL(`${BUBBLE_API_URL}/api/1.1/obj/${entityType}`);
  url.searchParams.set('cursor', cursor.toString());
  url.searchParams.set('limit', limit.toString());
  const response = await fetch(url.toString(), {
    headers: { 'Authorization': `Bearer ${BUBBLE_API_TOKEN}` }
  });
  if (!response.ok) throw new Error(`API error: ${response.status}`);
  const data = await response.json();
  return { results: data.response.results, remaining: data.response.remaining };
}

async function main() {
  console.log('Checking sheets in Bubble...');
  
  let cursor = 0;
  let remaining = 1;
  let total = 0;
  let withTags = 0;
  let tagCounts: Record<number, number> = {};
  
  while (remaining > 0) {
    const { results, remaining: r } = await fetchBubble('sheet', cursor, 100);
    remaining = r;
    cursor += results.length;
    
    for (const sheet of results as any[]) {
      total++;
      const tagCount = sheet.tags?.length || 0;
      if (tagCount > 0) {
        withTags++;
        tagCounts[tagCount] = (tagCounts[tagCount] || 0) + 1;
      }
    }
    
    if (total % 500 === 0) console.log('  Processed ' + total + '...');
  }
  
  console.log('\n=== Results ===');
  console.log('Total sheets in Bubble: ' + total);
  console.log('Sheets WITH tags: ' + withTags);
  console.log('Sheets WITHOUT tags: ' + (total - withTags));
  console.log('\nTag count distribution:');
  for (const [count, numSheets] of Object.entries(tagCounts).sort((a,b) => Number(a[0]) - Number(b[0]))) {
    console.log('  ' + count + ' tags: ' + numSheets + ' sheets');
  }
}

main().catch(console.error);
