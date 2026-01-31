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
  // Build bubble_id -> supabase_id map for tags
  const { data: tags } = await supabase
    .from('tags')
    .select('id, bubble_id, name');
  
  const tagMap = new Map();
  for (const t of tags || []) {
    if (t.bubble_id) {
      tagMap.set(t.bubble_id, t.id);
    }
  }
  console.log('Loaded', tagMap.size, 'tags with bubble_ids');

  // Build name -> supabase_id map for sheets
  const { data: sheets } = await supabase
    .from('sheets')
    .select('id, name');
  
  const sheetByName = new Map();
  for (const s of sheets || []) {
    sheetByName.set(s.name.toLowerCase().trim(), s.id);
  }
  console.log('Loaded', sheetByName.size, 'sheets by name');

  // Get existing sheet_tags to avoid duplicates
  const { data: existingTags } = await supabase
    .from('sheet_tags')
    .select('sheet_id, tag_id');
  
  const existingSet = new Set(
    (existingTags || []).map(st => st.sheet_id + '|' + st.tag_id)
  );
  console.log('Existing sheet_tags:', existingSet.size);

  // Fetch all Bubble sheets and create sheet_tags
  let cursor = 0;
  let remaining = 1;
  let created = 0;
  let skipped = 0;

  const toInsert: Array<{ sheet_id: string; tag_id: string }> = [];

  while (remaining > 0) {
    const { results, remaining: r } = await fetchBubble(cursor, 100);
    remaining = r;
    cursor += results.length;

    for (const bubbleSheet of results) {
      const sheetTags = bubbleSheet.tags || [];
      if (sheetTags.length === 0) {
        skipped++;
        continue;
      }

      // Find the sheet by name
      const sheetName = (bubbleSheet.Name || '').toLowerCase().trim();
      const supabaseSheetId = sheetByName.get(sheetName);
      
      if (!supabaseSheetId) {
        continue;
      }

      // Add tags
      for (const tagBubbleId of sheetTags) {
        const tagSupabaseId = tagMap.get(tagBubbleId);
        if (!tagSupabaseId) continue;

        const key = supabaseSheetId + '|' + tagSupabaseId;
        if (existingSet.has(key)) continue;

        existingSet.add(key); // Prevent duplicates in this run
        toInsert.push({
          sheet_id: supabaseSheetId,
          tag_id: tagSupabaseId
        });
      }
    }

    process.stdout.write('\rProcessed: ' + cursor + ' Bubble sheets, ' + toInsert.length + ' tags to insert...');
  }

  console.log('\n\nInserting', toInsert.length, 'sheet_tags...');

  // Batch insert
  for (let i = 0; i < toInsert.length; i += 500) {
    const batch = toInsert.slice(i, i + 500);
    const { error } = await supabase.from('sheet_tags').insert(batch);
    if (error) {
      console.log('Error inserting batch:', error.message);
    } else {
      created += batch.length;
    }
  }

  console.log('Done! Created', created, 'sheet_tags');

  // Verify
  const { count } = await supabase
    .from('sheet_tags')
    .select('*', { count: 'exact', head: true });
  
  console.log('Total sheet_tags now:', count);
}

fix();
