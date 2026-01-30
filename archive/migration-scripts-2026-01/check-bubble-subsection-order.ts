import fetch from 'node-fetch';
import dotenv from 'dotenv';
import { supabase } from './src/migration/supabase-client.js';

dotenv.config();

const BUBBLE_API_URL = process.env.BUBBLE_API_URL!;
const BUBBLE_API_TOKEN = process.env.BUBBLE_API_TOKEN!;

async function compareOrdering() {
  // Get Food Contact subsections from Supabase
  const { data: supabaseSubsections } = await supabase
    .from('subsections')
    .select('name, order_number, bubble_id, section_id')
    .eq('section_id', '558c9176-447d-4eff-af6e-a953c4f4fead')
    .order('order_number');

  console.log('Current Supabase ordering:');
  console.log('========================');
  supabaseSubsections?.forEach((sub) => {
    console.log(`4.${sub.order_number} - ${sub.name}`);
  });

  console.log('\n\nFetching from Bubble...');

  // Fetch all subsections from Bubble
  const url = `${BUBBLE_API_URL}/api/1.1/obj/Subsection`;
  const response = await fetch(url, {
    headers: { 'Authorization': `Bearer ${BUBBLE_API_TOKEN}` }
  });

  const data: any = await response.json();

  // Find the Food Contact subsections by matching bubble_ids
  const bubbleIds = supabaseSubsections?.map(s => s.bubble_id) || [];
  const bubbleSubsections = data.response.results.filter((b: any) => bubbleIds.includes(b._id));

  console.log('\nBubble subsections with Order field:');
  console.log('===================================');
  bubbleSubsections.forEach((sub: any) => {
    console.log(`${sub.Name}: Order = ${sub.Order !== undefined ? sub.Order : 'UNDEFINED'}, Created = ${sub['Created Date']}`);
  });
}

compareOrdering().catch(console.error);
