import fetch from 'node-fetch';

const BUBBLE_API_TOKEN = process.env.BUBBLE_API_TOKEN || 'your_token_here';
const BUBBLE_APP_NAME = 'stacksdata2050';

// Get the sheet from Bubble
const sheetResponse = await fetch(
  `https://${BUBBLE_APP_NAME}.bubbleapps.io/api/1.1/obj/questionnaire?constraints=[{"key":"_id","constraint_type":"equals","value":"1633437889744x760323786552901600"}]`,
  {
    headers: {
      'Authorization': `Bearer ${BUBBLE_API_TOKEN}`
    }
  }
);

const sheetData = await sheetResponse.json();
console.log('Sheet found:', sheetData.response?.results?.[0]?.Name);

// Get sections for this sheet
console.log('\nFetching Bubble structure...');
