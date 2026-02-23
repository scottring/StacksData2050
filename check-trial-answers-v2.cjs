const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  // Total trial answers
  const { count: totalTrialAnswers } = await supabase
    .from('answers')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', '2026-02-01');
  console.log('Total answers created since Feb 1:', totalTrialAnswers);

  // Non-empty trial answers (text_value)
  const { count: nonEmptyText } = await supabase
    .from('answers')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', '2026-02-01')
    .not('text_value', 'is', null)
    .neq('text_value', '');
  console.log('Non-empty text_value since Feb 1:', nonEmptyText);

  // Non-null choice_id
  const { count: withChoice } = await supabase
    .from('answers')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', '2026-02-01')
    .not('choice_id', 'is', null);
  console.log('With choice_id since Feb 1:', withChoice);

  // Non-null boolean_value
  const { count: withBool } = await supabase
    .from('answers')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', '2026-02-01')
    .not('boolean_value', 'is', null);
  console.log('With boolean_value since Feb 1:', withBool);

  // Modified after creation (someone actually edited them)
  const { count: modified } = await supabase
    .from('answers')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', '2026-02-01')
    .not('modified_at', 'is', null);
  console.log('Modified since Feb 1:', modified);

  // Get distinct sheets for trial answers
  const allTrialAnswers = [];
  let offset = 0;
  while (true) {
    const { data: batch } = await supabase
      .from('answers')
      .select('sheet_id')
      .gte('created_at', '2026-02-01')
      .range(offset, offset + 999);
    if (!batch || batch.length === 0) break;
    allTrialAnswers.push(...batch);
    offset += 1000;
    if (batch.length < 1000) break;
  }

  const sheetIds = [...new Set(allTrialAnswers.map(a => a.sheet_id).filter(Boolean))];
  console.log();
  console.log('Distinct sheets with trial-period answers:', sheetIds.length);

  // Get info about those sheets
  if (sheetIds.length > 0) {
    const { data: sheetInfo } = await supabase
      .from('sheets')
      .select('id, name, import_source, created_at, company_id, status')
      .in('id', sheetIds);

    const compIds = [...new Set((sheetInfo || []).map(s => s.company_id).filter(Boolean))];
    const { data: comps } = await supabase.from('companies').select('id, name').in('id', compIds);
    const compMap = {};
    for (const c of comps || []) compMap[c.id] = c.name;

    console.log();
    console.log('Sheets breakdown:');
    for (const s of (sheetInfo || []).sort((a, b) => (a.created_at || '').localeCompare(b.created_at || ''))) {
      // Count answers for this sheet
      const sheetAnswerCount = allTrialAnswers.filter(a => a.sheet_id === s.id).length;
      console.log('  ' + (s.name || 'unnamed').padEnd(40) +
        'answers: ' + String(sheetAnswerCount).padEnd(6) +
        'source: ' + (s.import_source || 'none').padEnd(12) +
        'status: ' + (s.status || 'none').padEnd(15) +
        'company: ' + (compMap[s.company_id] || 'unknown') +
        '  created: ' + (s.created_at || '').slice(0, 10));
    }
  }

  // Also: count answers that were MODIFIED during trial but created before
  const { count: modifiedDuringTrial } = await supabase
    .from('answers')
    .select('*', { count: 'exact', head: true })
    .gte('modified_at', '2026-02-01')
    .lt('created_at', '2026-02-01');
  console.log();
  console.log('Pre-existing answers modified during trial (Feb 1+):', modifiedDuringTrial);

  // Total answers that have any non-empty content AND were created/modified in trial
  // "Answers collected" could mean answers with actual content on trial sheets
  // Let's check answers on trial-created sheets (request source, created Feb 1+)
  const { data: trialSheets } = await supabase
    .from('sheets')
    .select('id')
    .eq('import_source', 'request')
    .gte('created_at', '2026-02-01');

  const trialSheetIds = (trialSheets || []).map(s => s.id);
  console.log('Trial-created sheet IDs:', trialSheetIds.length);

  let answersOnTrialSheets = 0;
  let filledOnTrialSheets = 0;
  for (const sid of trialSheetIds) {
    const { count: total } = await supabase
      .from('answers')
      .select('*', { count: 'exact', head: true })
      .eq('sheet_id', sid);
    answersOnTrialSheets += (total || 0);

    // Check for any filled value
    const { count: filled } = await supabase
      .from('answers')
      .select('*', { count: 'exact', head: true })
      .eq('sheet_id', sid)
      .or('text_value.neq.,choice_id.not.is.null,boolean_value.not.is.null,number_value.not.is.null,date_value.not.is.null');
    filledOnTrialSheets += (filled || 0);
  }
  console.log('Total answer rows on trial sheets:', answersOnTrialSheets);
  console.log('Filled answers on trial sheets:', filledOnTrialSheets);
}

check();
