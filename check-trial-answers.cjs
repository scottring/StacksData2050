const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  // Get a sample of trial-period answers
  const { data: samples, error: sampleErr } = await supabase
    .from('answers')
    .select('id, parent_sheet_id, parent_question_id, value, created_at, created_by, bubble_id')
    .gte('created_at', '2026-02-01')
    .limit(10);

  if (sampleErr) {
    console.log('Error fetching samples:', sampleErr.message);
  }

  console.log('Sample of answers created since Feb 1:');
  for (const a of samples || []) {
    console.log(JSON.stringify({
      id: a.id ? a.id.slice(0,8) : 'null',
      sheet: a.parent_sheet_id ? a.parent_sheet_id.slice(0,8) : 'NULL',
      question: a.parent_question_id ? a.parent_question_id.slice(0,8) : 'NULL',
      bubble: a.bubble_id || 'NULL',
      val: (a.value || '').slice(0, 50),
      created: a.created_at ? a.created_at.slice(0,19) : 'null',
      by: a.created_by ? a.created_by.slice(0,8) : 'NULL'
    }));
  }

  // Check how many have parent_sheet_id
  const { count: withSheet, error: e1 } = await supabase
    .from('answers')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', '2026-02-01')
    .not('parent_sheet_id', 'is', null);

  const { count: withoutSheet, error: e2 } = await supabase
    .from('answers')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', '2026-02-01')
    .is('parent_sheet_id', null);

  console.log();
  if (e1) console.log('Error withSheet:', e1.message);
  if (e2) console.log('Error withoutSheet:', e2.message);
  console.log('Trial answers WITH parent_sheet_id:', withSheet);
  console.log('Trial answers WITHOUT parent_sheet_id:', withoutSheet);

  // Check bubble_id
  const { count: withBubble } = await supabase
    .from('answers')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', '2026-02-01')
    .not('bubble_id', 'is', null);

  const { count: withoutBubble } = await supabase
    .from('answers')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', '2026-02-01')
    .is('bubble_id', null);

  console.log('Trial answers WITH bubble_id (migrated):', withBubble);
  console.log('Trial answers WITHOUT bubble_id (app-created):', withoutBubble);

  // Non-empty
  const { count: nonEmpty } = await supabase
    .from('answers')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', '2026-02-01')
    .not('value', 'is', null)
    .neq('value', '');
  console.log('Non-empty answers since Feb 1:', nonEmpty);

  // Get distinct sheets for trial answers
  const { data: answerSheetIds } = await supabase
    .from('answers')
    .select('parent_sheet_id')
    .gte('created_at', '2026-02-01')
    .not('parent_sheet_id', 'is', null)
    .limit(500);

  const uniqueSheetIds = [...new Set((answerSheetIds || []).map(a => a.parent_sheet_id))];
  console.log('Distinct sheets with trial-period answers:', uniqueSheetIds.length);

  if (uniqueSheetIds.length > 0) {
    const { data: sheetInfo } = await supabase
      .from('sheets')
      .select('id, name, import_source, created_at, company_id')
      .in('id', uniqueSheetIds.slice(0, 20));

    const compIds = [...new Set((sheetInfo || []).map(s => s.company_id).filter(Boolean))];
    const { data: comps } = await supabase.from('companies').select('id, name').in('id', compIds);
    const compMap = {};
    for (const c of comps || []) compMap[c.id] = c.name;

    console.log('Sheets:');
    for (const s of sheetInfo || []) {
      console.log('  ' + (s.name || 'unnamed').padEnd(40) + 'source: ' + (s.import_source || 'none').padEnd(15) + 'created: ' + (s.created_at || '').slice(0, 10) + '  company: ' + (compMap[s.company_id] || 'unknown'));
    }
  }

  // Also check: maybe the 2027 number comes from answers on ALL request-created sheets (not just Feb 1+)
  const { data: allRequestSheets } = await supabase
    .from('sheets')
    .select('id')
    .eq('import_source', 'request');

  const reqSheetIds = (allRequestSheets || []).map(s => s.id);
  console.log();
  console.log('Total request-source sheets:', reqSheetIds.length);

  // Count answers per request sheet
  let totalOnRequestSheets = 0;
  let nonEmptyOnRequestSheets = 0;
  for (let i = 0; i < reqSheetIds.length; i += 5) {
    const batch = reqSheetIds.slice(i, i + 5);
    const { count: c1 } = await supabase.from('answers').select('*', { count: 'exact', head: true }).in('parent_sheet_id', batch);
    const { count: c2 } = await supabase.from('answers').select('*', { count: 'exact', head: true }).in('parent_sheet_id', batch).not('value', 'is', null).neq('value', '');
    totalOnRequestSheets += (c1 || 0);
    nonEmptyOnRequestSheets += (c2 || 0);
  }
  console.log('Total answer rows on request sheets:', totalOnRequestSheets);
  console.log('Non-empty answers on request sheets:', nonEmptyOnRequestSheets);
}

check();
