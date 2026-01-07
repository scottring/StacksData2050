import { config } from 'dotenv';
config();

const BUBBLE_API_URL = process.env.BUBBLE_API_URL;
const BUBBLE_API_TOKEN = process.env.BUBBLE_API_TOKEN;

console.log('Fetching Ecolabels section from Bubble...\n');

// Get the Ecolabels section
const sectionResponse = await fetch(
  `${BUBBLE_API_URL}/api/1.1/obj/section?constraints=[{"key":"Name","constraint_type":"equals","value":"Ecolabels"}]`,
  {
    headers: {
      'Authorization': `Bearer ${BUBBLE_API_TOKEN}`
    }
  }
);

const sectionData = await sectionResponse.json();
const section = sectionData.response?.results?.[0];

if (!section) {
  console.log('Section not found');
  process.exit(1);
}

console.log(`Section: ${section.Name}`);
console.log(`Section ID: ${section._id}\n`);

// Get subsections for this section
const subsectionResponse = await fetch(
  `${BUBBLE_API_URL}/api/1.1/obj/subsection?constraints=[{"key":"Parent Section","constraint_type":"equals","value":"${section._id}"}]&sort_field=Order Number`,
  {
    headers: {
      'Authorization': `Bearer ${BUBBLE_API_TOKEN}`
    }
  }
);

const subsectionData = await subsectionResponse.json();
const subsections = subsectionData.response?.results || [];

console.log('=== BUBBLE ECOLABELS STRUCTURE ===\n');

for (let i = 0; i < subsections.length; i++) {
  const sub = subsections[i];
  console.log(`2.${i + 1} ${sub.Name}`);

  // Get questions for this subsection
  const questionResponse = await fetch(
    `${BUBBLE_API_URL}/api/1.1/obj/question?constraints=[{"key":"Parent Subsection","constraint_type":"equals","value":"${sub._id}"}]&sort_field=Order Number`,
    {
      headers: {
        'Authorization': `Bearer ${BUBBLE_API_TOKEN}`
      }
    }
  );

  const questionData = await questionResponse.json();
  const questions = questionData.response?.results || [];

  questions.forEach((q, qIdx) => {
    console.log(`  2.${i + 1}.${qIdx + 1} ${q.Name?.substring(0, 70)}`);
  });
  console.log();
}
