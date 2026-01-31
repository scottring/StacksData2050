import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const BUBBLE_API_URL = process.env.BUBBLE_API_URL!;
const BUBBLE_API_TOKEN = process.env.BUBBLE_API_TOKEN!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function fetchBubble(cursor = 0, limit = 100) {
  const url = BUBBLE_API_URL + '/api/1.1/obj/sheet?cursor=' + cursor + '&limit=' + limit;
  const response = await fetch(url, {
    headers: { 'Authorization': 'Bearer ' + BUBBLE_API_TOKEN }
  });
  const data = await response.json();
  return { results: data.response.results, remaining: data.response.remaining };
}

async function fix() {
  // Build bubble_id -> supabase_id map for companies
  const { data: companies } = await supabase
    .from('companies')
    .select('id, bubble_id, name');
  
  const companyMap = new Map();
  for (const c of companies || []) {
    if (c.bubble_id) {
      companyMap.set(c.bubble_id, c.id);
    }
  }
  console.log('Loaded', companyMap.size, 'companies with bubble_ids');

  // Build bubble_id -> supabase_id map for sheets  
  const { data: sheets } = await supabase
    .from('sheets')
    .select('id, name');
  
  const sheetByName = new Map();
  for (const s of sheets || []) {
    sheetByName.set(s.name.toLowerCase().trim(), s.id);
  }
  console.log('Loaded', sheetByName.size, 'sheets by name');

  // Fetch all Bubble sheets and update requesting_company_id
  let cursor = 0;
  let remaining = 1;
  let updated = 0;
  let skipped = 0;
  let notFound = 0;

  while (remaining > 0) {
    const { results, remaining: r } = await fetchBubble(cursor, 100);
    remaining = r;
    cursor += results.length;

    for (const bubbleSheet of results) {
      const requestorBubbleId = bubbleSheet['Original Requestor assoc'];
      if (!requestorBubbleId) {
        skipped++;
        continue;
      }

      const requestorSupabaseId = companyMap.get(requestorBubbleId);
      if (!requestorSupabaseId) {
        skipped++;
        continue;
      }

      // Find the sheet by name
      const sheetName = (bubbleSheet.Name || '').toLowerCase().trim();
      const supabaseSheetId = sheetByName.get(sheetName);
      
      if (!supabaseSheetId) {
        notFound++;
        continue;
      }

      // Update the sheet
      const { error } = await supabase
        .from('sheets')
        .update({ requesting_company_id: requestorSupabaseId })
        .eq('id', supabaseSheetId);

      if (!error) {
        updated++;
      }
    }

    console.log('Progress:', cursor, 'processed,', updated, 'updated,', notFound, 'not found');
    
    // Rate limiting
    await new Promise(r => setTimeout(r, 100));
  }

  console.log('\nDone!');
  console.log('  Updated:', updated);
  console.log('  Skipped (no requestor):', skipped);
  console.log('  Not found:', notFound);

  // Verify UPM now has sheets
  const UPM_ID = '86db93bf-9c1d-467a-9a2b-4625a5dbaaf1';
  const { count } = await supabase
    .from('sheets')
    .select('*', { count: 'exact', head: true })
    .eq('requesting_company_id', UPM_ID);
  
  console.log('\nUPM sheets (as customer):', count);
}

fix();
