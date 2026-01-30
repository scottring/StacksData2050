/**
 * Analyze subsection Order field in Bubble export
 */
import * as fs from 'fs';

const subsections = JSON.parse(fs.readFileSync('fresh-import/bubble-export/subsection.json', 'utf-8'));
const sections = JSON.parse(fs.readFileSync('fresh-import/bubble-export/section.json', 'utf-8'));
const questions = JSON.parse(fs.readFileSync('fresh-import/bubble-export/question.json', 'utf-8'));

// Build section name map
const sectionNameMap = new Map(sections.map((s: any) => [s._id, s.Name]));

// Check how many have Order defined vs undefined
const withOrder = subsections.filter((s: any) => s.Order !== undefined);
const withoutOrder = subsections.filter((s: any) => s.Order === undefined);

console.log('Total subsections:', subsections.length);
console.log('With Order defined:', withOrder.length);
console.log('Without Order:', withoutOrder.length);

// Show some examples with and without Order
console.log('\n=== With Order (first 10) ===');
withOrder.slice(0, 10).forEach((s: any) => {
  const sectionName = sectionNameMap.get(s.Parent_Section) || 'No section';
  console.log(`  Order: ${s.Order} - ${(s.Name || 'N/A').substring(0, 40)} [${sectionName.substring(0, 20)}]`);
});

console.log('\n=== Without Order (first 15) ===');
withoutOrder.slice(0, 15).forEach((s: any) => {
  const sectionName = sectionNameMap.get(s.Parent_Section) || 'No section';
  const created = s['Created Date']?.substring(0, 10) || 'N/A';
  const hasQuestions = (s.listOfQuestions?.length || 0) > 0;
  console.log(`  Created: ${created} - ${(s.Name || 'N/A').substring(0, 35).padEnd(35)} [${sectionName.substring(0, 20)}] Questions: ${hasQuestions}`);
});

// Group subsections by section and analyze ordering within each section
console.log('\n=== Subsections grouped by Section ===');
const bySection = new Map<string, any[]>();
for (const sub of subsections) {
  if (!sub.Parent_Section) continue;
  if (!bySection.has(sub.Parent_Section)) {
    bySection.set(sub.Parent_Section, []);
  }
  bySection.get(sub.Parent_Section)!.push(sub);
}

// Find the "Product Information" section
const productInfoSection = sections.find((s: any) => s.Name === 'Product Information');
if (productInfoSection) {
  console.log('\n=== Product Information Section Subsections ===');
  const subs = bySection.get(productInfoSection._id) || [];

  // Sort by Created Date as fallback
  subs.sort((a: any, b: any) => {
    // If both have Order, use Order
    if (a.Order !== undefined && b.Order !== undefined) {
      return a.Order - b.Order;
    }
    // If only one has Order, prefer the one with Order
    if (a.Order !== undefined) return -1;
    if (b.Order !== undefined) return 1;
    // Otherwise use Created Date
    return new Date(a['Created Date']).getTime() - new Date(b['Created Date']).getTime();
  });

  subs.forEach((s: any, i: number) => {
    const orderStr = s.Order !== undefined ? `Order: ${s.Order}` : 'No Order';
    const qCount = s.listOfQuestions?.length || 0;
    console.log(`  ${i + 1}. ${orderStr.padEnd(12)} - ${(s.Name || 'N/A').substring(0, 50)} (${qCount} questions)`);
  });
}

// Check questions for Order field
console.log('\n=== Question Order Analysis ===');
const qWithOrder = questions.filter((q: any) => q.Order !== undefined);
const qWithoutOrder = questions.filter((q: any) => q.Order === undefined);
console.log('Questions with Order:', qWithOrder.length);
console.log('Questions without Order:', qWithoutOrder.length);

// Check sections for Order field
console.log('\n=== Section Order Analysis ===');
const secWithOrder = sections.filter((s: any) => s.Order !== undefined);
const secWithoutOrder = sections.filter((s: any) => s.Order === undefined);
console.log('Sections with Order:', secWithOrder.length);
console.log('Sections without Order:', secWithoutOrder.length);

sections.sort((a: any, b: any) => (a.Order || 999) - (b.Order || 999));
console.log('\n=== All Sections with Order ===');
sections.forEach((s: any) => {
  const orderStr = s.Order !== undefined ? `Order: ${s.Order}` : 'No Order';
  console.log(`  ${orderStr.padEnd(12)} - ${s.Name || 'N/A'}`);
});
