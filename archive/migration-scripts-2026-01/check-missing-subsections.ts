import { supabase } from './src/migration/supabase-client.js';
import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config();

const BUBBLE_API_URL = process.env.BUBBLE_API_URL!;
const BUBBLE_API_TOKEN = process.env.BUBBLE_API_TOKEN!;

async function checkMissingSubsections() {
  console.log('=== Checking Missing Subsections ===\n');

  const bubbleIds = [
    '1619000068938x430610858366205950',
    '1626100227219x754871618292678700',
    '1629288872286x476960495462776800',
    '1626117082942x613188737337393200'
  ];

  for (const bubbleId of bubbleIds) {
    console.log(`\nBubble ID: ${bubbleId}`);

    // Check ID mapping table
    const { data: mapping } = await supabase
      .from('_migration_id_map')
      .select('*')
      .eq('bubble_id', bubbleId)
      .eq('entity_type', 'subsection')
      .single();

    if (mapping) {
      console.log(`  ID Map: ${mapping.supabase_id}`);

      // Check if subsection exists
      const { data: subsection } = await supabase
        .from('subsections')
        .select('*')
        .eq('id', mapping.supabase_id)
        .single();

      if (subsection) {
        console.log(`  ✓ Subsection exists: "${subsection.name}"`);
      } else {
        console.log(`  ❌ Subsection DELETED or never created`);

        // Check Bubble to see what this subsection was
        const url = `${BUBBLE_API_URL}/api/1.1/obj/subsection/${bubbleId}`;
        const response = await fetch(url, {
          headers: { 'Authorization': `Bearer ${BUBBLE_API_TOKEN}` }
        });
        const bubbleData: any = await response.json();

        if (bubbleData.response) {
          console.log(`  Bubble name: "${bubbleData.response.Name}"`);
          console.log(`  Bubble order: ${bubbleData.response.Order || '(undefined)'}`);

          // Check if it has questions
          const questionsUrl = `${BUBBLE_API_URL}/api/1.1/obj/question?constraints=[{"key":"Parent Subsection","constraint_type":"equals","value":"${bubbleId}"}]`;
          const qResp = await fetch(questionsUrl, {
            headers: { 'Authorization': `Bearer ${BUBBLE_API_TOKEN}` }
          });
          const qData: any = await qResp.json();
          const questionCount = qData.response?.results?.length || 0;
          console.log(`  Question count: ${questionCount}`);
        }
      }
    } else {
      console.log(`  ❌ Not found in ID map`);
    }
  }
}

checkMissingSubsections().catch(console.error);
