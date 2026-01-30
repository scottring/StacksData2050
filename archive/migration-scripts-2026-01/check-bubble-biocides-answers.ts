import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config();

const BUBBLE_API_URL = process.env.BUBBLE_API_URL!;
const BUBBLE_API_TOKEN = process.env.BUBBLE_API_TOKEN!;

async function getBubbleAnswers() {
  const sheetId = '1636031591594x483952580354375700'; // Correct sheet ID from Bubble URL
  const questionId = '1621985947370x515150303537922050';

  const url = `${BUBBLE_API_URL}/api/1.1/obj/answer?constraints=[{"key":"Sheet","constraint_type":"equals","value":"${sheetId}"},{"key":"Parent Question","constraint_type":"equals","value":"${questionId}"}]&limit=50`;

  const response = await fetch(url, {
    headers: { 'Authorization': `Bearer ${BUBBLE_API_TOKEN}` }
  });

  const data: any = await response.json();

  if (data.response === undefined) {
    console.log('Error:', JSON.stringify(data, null, 2));
    return;
  }

  console.log('Bubble answers for biocides question in Hydrocarb 60 BE 70%:');
  console.log('Total answers:', data.response.results.length);
  console.log('');

  // Group by List Table Row
  const byRow: Record<string, any[]> = {};
  data.response.results.forEach((answer: any) => {
    const rowId = answer['List Table Row'] || 'no-row';
    if (byRow[rowId] === undefined) byRow[rowId] = [];
    byRow[rowId].push(answer);
  });

  Object.entries(byRow).forEach(([rowId, answers]) => {
    console.log(`Row ID: ${rowId}`);
    answers.forEach(a => {
      console.log(`  Column: ${a['List Table Column']}`);
      console.log(`  Value: ${a.text || a.Text || '(empty)'}`);
    });
    console.log('');
  });
}

getBubbleAnswers().catch(console.error);
