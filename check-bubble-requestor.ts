import * as dotenv from 'dotenv';
dotenv.config();

const BUBBLE_API_URL = process.env.BUBBLE_API_URL!;
const BUBBLE_API_TOKEN = process.env.BUBBLE_API_TOKEN!;

async function check() {
  // Fetch a few sheets from Bubble
  const url = BUBBLE_API_URL + '/api/1.1/obj/sheet?limit=10';
  const response = await fetch(url, {
    headers: { 'Authorization': 'Bearer ' + BUBBLE_API_TOKEN }
  });
  
  const data = await response.json();
  
  console.log('Sample Bubble sheets:');
  for (const sheet of data.response.results) {
    console.log('\n' + sheet.Name + ':');
    console.log('  _id:', sheet._id);
    console.log('  Company:', sheet.Company);
    console.log('  Sup Assigned to:', sheet['Sup Assigned to']);
    console.log('  Original Requestor assoc:', sheet['Original Requestor assoc']);
  }

  // Count sheets with Original Requestor assoc
  const countUrl = BUBBLE_API_URL + '/api/1.1/obj/sheet?limit=1';
  const countRes = await fetch(countUrl, {
    headers: { 'Authorization': 'Bearer ' + BUBBLE_API_TOKEN }
  });
  const countData = await countRes.json();
  console.log('\n\nTotal Bubble sheets:', countData.response.remaining + 1);
}

check();
