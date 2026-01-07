import { config } from 'dotenv';
config();

const BUBBLE_API_URL = process.env.BUBBLE_API_URL;
const BUBBLE_API_TOKEN = process.env.BUBBLE_API_TOKEN;

console.log('Fetching all sections from Bubble...\n');

const sectionResponse = await fetch(
  `${BUBBLE_API_URL}/api/1.1/obj/section?sort_field=Order Number`,
  {
    headers: {
      'Authorization': `Bearer ${BUBBLE_API_TOKEN}`
    }
  }
);

const sectionData = await sectionResponse.json();
const sections = sectionData.response?.results || [];

console.log('=== ALL BUBBLE SECTIONS ===\n');
sections.forEach((section: any, idx: number) => {
  console.log(`${idx + 1}. "${section.Name}" (ID: ${section._id}, Order: ${section['Order Number']})`);
});
