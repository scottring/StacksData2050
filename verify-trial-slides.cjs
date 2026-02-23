const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '/Users/scottkaufman/Developer/StacksData2050/stacks/.env' });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function verify() {
  const { data: companies } = await supabase.from('companies').select('id, name');
  const { data: users } = await supabase.from('users').select('id, email, company_id, role, created_at');
  const compMap = {};
  for (const c of companies || []) compMap[c.id] = c.name;

  const realUsers = (users || []).filter(u => {
    if (!u.email) return false;
    if (u.email.includes('stacksdata')) return false;
    if (u.email.includes('smkaufman')) return false;
    if (u.email.includes('placeholder')) return false;
    if (u.email.includes('test')) return false;
    return true;
  });

  const activeCompanyIds = new Set(realUsers.map(u => u.company_id).filter(Boolean));
  const activeCompanies = (companies || []).filter(c => {
    if (!activeCompanyIds.has(c.id)) return false;
    if (c.name.toLowerCase().includes('stacks')) return false;
    if (c.name.toLowerCase().includes('test')) return false;
    return true;
  });

  console.log('=== SLIDE VERIFICATION (TRIAL-SPECIFIC) ===');
  console.log();
  console.log('COMPANIES ACTIVE (Slide says: 6)');
  console.log('  DB count:', activeCompanies.length);
  console.log('  Names:', activeCompanies.map(c => c.name).join(', '));
  console.log();

  // Auth users who logged in during trial
  const { data: authUsersData } = await supabase.auth.admin.listUsers({ perPage: 1000 });
  const trialStart = new Date('2026-02-01');
  const loggedInUsers = new Set();
  for (const au of (authUsersData?.users || [])) {
    if (au.last_sign_in_at && new Date(au.last_sign_in_at) >= trialStart) {
      loggedInUsers.add(au.id);
    }
  }

  const { data: requests } = await supabase.from('requests').select('id, created_by, created_at');
  const requestCreators = new Set((requests || []).map(r => r.created_by).filter(Boolean));

  const { data: sheets } = await supabase.from('sheets').select('id, name, status, import_source, created_at, created_by, company_id');
  const requestSheets = (sheets || []).filter(s => s.import_source === 'request');
  const sheetCreators = new Set(requestSheets.map(s => s.created_by).filter(Boolean));

  const allActiveIds = new Set([...loggedInUsers, ...requestCreators, ...sheetCreators]);
  const activeRealUsers = realUsers.filter(u => allActiveIds.has(u.id));

  console.log('REAL USERS (Slide says: 29)');
  console.log('  Total external user accounts:', realUsers.length);
  console.log('  Actually interacted (logged in / created requests/sheets):', activeRealUsers.length);
  console.log();

  // SHEETS CREATED
  const trialSheets = requestSheets.filter(s => s.created_at && new Date(s.created_at) >= trialStart);
  console.log('SHEETS CREATED (Slide says: 32)');
  console.log('  Total sheets from requests (all time):', requestSheets.length);
  console.log('  Created since Feb 1 (trial period):', trialSheets.length);
  console.log();

  // REQUESTS SENT
  const trialRequests = (requests || []).filter(r => r.created_at && new Date(r.created_at) >= trialStart);
  console.log('REQUESTS SENT (Slide says: 27)');
  console.log('  Total requests (all time):', (requests || []).length);
  console.log('  Created since Feb 1 (trial period):', trialRequests.length);
  console.log();

  // ANSWERS COLLECTED
  const { count: totalAnswers } = await supabase.from('answers').select('*', { count: 'exact', head: true });
  const { count: trialAnswers } = await supabase.from('answers').select('*', { count: 'exact', head: true }).gte('created_at', '2026-02-01');

  console.log('ANSWERS COLLECTED (Slide says: 2,027)');
  console.log('  Total in DB (includes migrated):', totalAnswers);
  console.log('  Created since Feb 1:', trialAnswers);

  // Answers on trial-created sheets
  const trialSheetIds = trialSheets.map(s => s.id);
  if (trialSheetIds.length > 0) {
    // Need to batch since IN clause has limits
    let trialSheetAnswerCount = 0;
    let nonEmptyCount = 0;
    for (let i = 0; i < trialSheetIds.length; i += 10) {
      const batch = trialSheetIds.slice(i, i + 10);
      const { count: c1 } = await supabase.from('answers').select('*', { count: 'exact', head: true }).in('parent_sheet_id', batch);
      trialSheetAnswerCount += (c1 || 0);

      const { count: c2 } = await supabase.from('answers').select('*', { count: 'exact', head: true }).in('parent_sheet_id', batch).not('value', 'is', null).neq('value', '');
      nonEmptyCount += (c2 || 0);
    }
    console.log('  Answers on trial-created sheets (total rows):', trialSheetAnswerCount);
    console.log('  Non-empty answers on trial sheets:', nonEmptyCount);
  }

  // Check recent answers structure
  const { data: recentAnswers } = await supabase.from('answers').select('id, parent_sheet_id, value, created_at').gte('created_at', '2026-02-01').not('value', 'is', null).neq('value', '').limit(5);
  if (recentAnswers && recentAnswers.length > 0) {
    console.log('  Sample non-empty recent answers:');
    for (const a of recentAnswers) {
      console.log('    sheet:', a.parent_sheet_id, 'val:', (a.value || '').slice(0, 60));
    }
  }
  console.log();

  // PIPELINE STATUS
  console.log('PIPELINE STATUS (trial sheets only):');
  const statusCounts = {};
  for (const s of trialSheets) {
    const st = s.status || 'unknown';
    statusCounts[st] = (statusCounts[st] || 0) + 1;
  }
  for (const [status, count] of Object.entries(statusCounts).sort()) {
    console.log('  ' + status + ':', count);
  }
  console.log();

  // DAILY BREAKDOWN
  console.log('DAILY SHEETS CREATED (trial period):');
  const dailyCounts = {};
  for (const s of trialSheets) {
    const day = s.created_at ? s.created_at.slice(0, 10) : 'unknown';
    dailyCounts[day] = (dailyCounts[day] || 0) + 1;
  }
  for (const [day, count] of Object.entries(dailyCounts).sort()) {
    console.log('  ' + day + ':', count);
  }
  console.log();

  // SHEET DETAIL
  console.log('TRIAL SHEETS:');
  for (const s of trialSheets.sort((a, b) => (a.created_at || '').localeCompare(b.created_at || ''))) {
    console.log('  ' + (s.name || 'unnamed').padEnd(45) + (s.status || 'none').padEnd(18) + (compMap[s.company_id] || 'unknown'));
  }
}

verify();
