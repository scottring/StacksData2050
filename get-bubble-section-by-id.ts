import { config } from 'dotenv';
config();

const BUBBLE_API_URL = process.env.BUBBLE_API_URL;
const BUBBLE_API_TOKEN = process.env.BUBBLE_API_TOKEN;

const sectionBubbleId = '1617069659217x956109532887253000';

console.log('Fetching section from Bubble by ID...\n');

// Get the section by its Bubble ID
const sectionResponse = await fetch(
  `${BUBBLE_API_URL}/api/1.1/obj/section/${sectionBubbleId}`,
  {
    headers: {
      'Authorization': `Bearer ${BUBBLE_API_TOKEN}`
    }
  }
);

const sectionData = await sectionResponse.json();
console.log('Section:', sectionData);

if (sectionData.response) {
  const section = sectionData.response;
  console.log(`\nSection: ${section.Name}`);
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
    console.log(`2.${i + 1} ${sub.Name} (Order: ${sub['Order Number']})`);

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

    questions.forEach((q: any, qIdx: number) => {
      console.log(`  2.${i + 1}.${qIdx + 1} (Order ${q['Order Number']}): ${q.Name?.substring(0, 70)}`);
    });
    console.log();
  }
}
