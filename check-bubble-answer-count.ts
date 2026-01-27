import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config();

const BUBBLE_API_URL = process.env.BUBBLE_API_URL!;
const BUBBLE_API_TOKEN = process.env.BUBBLE_API_TOKEN!;

async function checkCount() {
  const sheetId = '1636031591594x483952580354375700';

  // First request to see pagination info
  const url = `${BUBBLE_API_URL}/api/1.1/obj/answer?constraints=[{"key":"Sheet","constraint_type":"equals","value":"${sheetId}"}]`;

  const response = await fetch(url, {
    headers: { 'Authorization': `Bearer ${BUBBLE_API_TOKEN}` }
  });

  const data: any = await response.json();

  console.log('=== Bubble Answer Count for Hydrocarb ===\n');
  console.log('Results in first page:', data.response?.results?.length || 0);
  console.log('Remaining:', data.response?.remaining || 0);
  console.log('Count:', data.response?.count);
  console.log('Total expected:', (data.response?.results?.length || 0) + (data.response?.remaining || 0));
}

checkCount().catch(console.error);
