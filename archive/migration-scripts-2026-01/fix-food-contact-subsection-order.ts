import { supabase } from './src/migration/supabase-client.js';

/**
 * Fix Food Contact subsection ordering based on actual Bubble display order
 *
 * The correct order from Bubble is:
 * 4.1 General Information
 * 4.2 European Union - Framework Regulation
 * 4.3 European Union - National Regulation - Germany (BfR)
 * 4.4 The Netherlands
 * 4.5 Switzerland
 * 4.6 Italy
 * 4.7 France
 * 4.8 Other relevant national legislations in Europe
 * 4.9 European Union - Plastics & Dual Use Additives
 * 4.10 USA
 * 4.11 China
 * 4.12 South America (MERCOSUR)
 */

async function fixFoodContactSubsectionOrder() {
  console.log('=== Fixing Food Contact Subsection Order ===\n');

  // Get Food Contact section
  const { data: section } = await supabase
    .from('sections')
    .select('id')
    .eq('name', 'Food Contact')
    .single();

  if (!section) {
    console.log('❌ Food Contact section not found');
    return;
  }

  // Get all subsections for Food Contact
  const { data: subsections } = await supabase
    .from('subsections')
    .select('id, name, order_number')
    .eq('section_id', section.id);

  if (!subsections) {
    console.log('❌ No subsections found');
    return;
  }

  console.log('Current subsections:');
  subsections
    .sort((a, b) => (a.order_number || 999) - (b.order_number || 999))
    .forEach(sub => {
      console.log(`  4.${sub.order_number} - ${sub.name}`);
    });

  // Define the correct ordering based on Bubble
  const correctOrder: { name: string; order: number }[] = [
    { name: 'General Information', order: 1 },
    { name: 'European Union - Framework Regulation', order: 2 },
    { name: 'European Union - National Regulation - Germany: Does the product comply with the requirements of the following BfR (Federal Institute for Risk Assessment) recommendations below?', order: 3 },
    { name: 'The Netherlands', order: 4 },
    { name: 'Switzerland', order: 5 },
    { name: 'Italy', order: 6 },
    { name: 'France', order: 7 },
    { name: 'Other relevant national legislations in Europe', order: 8 },
    { name: 'European Union - Plastics & Dual Use Additives', order: 9 },
    { name: 'USA - Can the product be used for the manufacture of Food Contact Articles in compliance with the U.S. Federal Food Drug and Cosmetic Act and all applicable "Food Additive Regulations" 21CFR part 170-199, especially the following ones?', order: 10 },
    { name: 'China - Does the product comply with the requirements of the Chinese Food Contact Materials Hygiene Standards specified below?', order: 11 },
    { name: 'South America: Does the product comply with the requirements of the respective MERCOSUR GMC Resolutions and respective national implementations in Brasil, Paraguay and Uruguay, specified below?', order: 12 },
  ];

  console.log('\n=== Applying Updates ===\n');

  let updated = 0;
  let notFound = 0;

  for (const { name, order } of correctOrder) {
    const subsection = subsections.find(s => s.name === name);

    if (!subsection) {
      console.log(`❌ Subsection not found: ${name}`);
      notFound++;
      continue;
    }

    if (subsection.order_number === order) {
      console.log(`✓ ${name} already has correct order ${order}`);
      continue;
    }

    // Update subsection order_number
    const { error: subError } = await supabase
      .from('subsections')
      .update({ order_number: order })
      .eq('id', subsection.id);

    if (subError) {
      console.log(`❌ Failed to update subsection ${name}: ${subError.message}`);
      continue;
    }

    // Update all questions for this subsection to have matching subsection_sort_number
    const { error: qError } = await supabase
      .from('questions')
      .update({ subsection_sort_number: order })
      .eq('parent_subsection_id', subsection.id);

    if (qError) {
      console.log(`❌ Failed to update questions for ${name}: ${qError.message}`);
      continue;
    }

    console.log(`✓ Updated ${name}: order ${subsection.order_number} → ${order}`);
    updated++;
  }

  console.log(`\n=== Summary ===`);
  console.log(`Updated: ${updated}`);
  console.log(`Not Found: ${notFound}`);

  // Verify the new ordering
  console.log('\n=== New Subsection Order ===');
  const { data: newSubsections } = await supabase
    .from('subsections')
    .select('id, name, order_number')
    .eq('section_id', section.id)
    .order('order_number');

  newSubsections?.forEach(sub => {
    console.log(`  4.${sub.order_number} - ${sub.name}`);
  });
}

fixFoodContactSubsectionOrder().catch(console.error);
