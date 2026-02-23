const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function verify() {
  const { data: companies } = await supabase.from('companies').select('id, name');
  const companyMap = {};
  for (const c of companies || []) companyMap[c.id] = c.name;

  // Users who created requests
  const { data: requests } = await supabase.from('requests').select('created_by');
  const requestCreators = new Set((requests || []).map(r => r.created_by).filter(Boolean));

  // Users who created sheets (via request)
  const { data: sheets } = await supabase.from('sheets').select('created_by, import_source');
  const sheetCreators = new Set((sheets || []).filter(s => s.import_source === 'request').map(s => s.created_by).filter(Boolean));

  // Users who submitted answers
  const { data: answers } = await supabase.from('answers').select('created_by').not('created_by', 'is', null);
  const answerCreators = new Set((answers || []).map(a => a.created_by).filter(Boolean));

  // Users who logged in (check auth.users for last_sign_in_at during trial period)
  const { data: authUsers } = await supabase.auth.admin.listUsers({ perPage: 1000 });
  const trialStart = new Date('2026-02-01');
  const recentLogins = new Map();
  for (const au of (authUsers?.users || [])) {
    if (au.last_sign_in_at && new Date(au.last_sign_in_at) >= trialStart) {
      recentLogins.set(au.id, au.last_sign_in_at);
    }
  }

  // Check trial_activity_events if it exists
  let activityUsers = new Set();
  try {
    const { data: events } = await supabase.from('trial_activity_events').select('user_id');
    activityUsers = new Set((events || []).map(e => e.user_id).filter(Boolean));
  } catch (e) {
    // table may not exist
  }

  // Combine all active user IDs
  const allActiveIds = new Set([
    ...requestCreators,
    ...sheetCreators,
    ...answerCreators,
    ...recentLogins.keys(),
    ...activityUsers,
  ]);

  // Get user details
  const { data: users } = await supabase.from('users').select('id, email, full_name, company_id, role');
  const userMap = {};
  for (const u of users || []) userMap[u.id] = u;

  console.log('=== USERS WHO ACTUALLY INTERACTED WITH THE TRIAL ===');
  console.log();
  console.log('Activity sources:');
  console.log('  Created requests:', requestCreators.size);
  console.log('  Created sheets:', sheetCreators.size);
  console.log('  Submitted answers:', answerCreators.size);
  console.log('  Logged in since Feb 1:', recentLogins.size);
  console.log('  Trial activity events:', activityUsers.size);
  console.log();

  // Build detailed user list
  const activeUsers = [];
  for (const uid of allActiveIds) {
    const u = userMap[uid];
    if (!u) continue;
    if (u.email && u.email.includes('stacksdata')) continue;
    if (u.email && u.email.includes('smkaufman')) continue;
    if (u.email && u.email.includes('placeholder')) continue;

    const activities = [];
    if (requestCreators.has(uid)) activities.push('created requests');
    if (sheetCreators.has(uid)) activities.push('created sheets');
    if (answerCreators.has(uid)) activities.push('answered questions');
    if (recentLogins.has(uid)) activities.push('logged in ' + recentLogins.get(uid).slice(0, 10));
    if (activityUsers.has(uid)) activities.push('trial activity');

    activeUsers.push({
      name: u.full_name || 'Unknown',
      email: u.email,
      company: companyMap[u.company_id] || 'Unknown',
      activities,
    });
  }

  // Sort by company then name
  activeUsers.sort((a, b) => a.company.localeCompare(b.company) || a.name.localeCompare(b.name));

  console.log('ACTIVE USERS (excluding internal): ' + activeUsers.length);
  console.log();

  let currentCompany = '';
  let companyCount = 0;
  const companyCounts = {};
  for (const u of activeUsers) {
    if (u.company !== currentCompany) {
      currentCompany = u.company;
      console.log(currentCompany + ':');
    }
    companyCounts[u.company] = (companyCounts[u.company] || 0) + 1;
    console.log('  ' + u.name.padEnd(35) + u.email.padEnd(45) + u.activities.join(', '));
  }

  console.log();
  console.log('SUMMARY:');
  console.log('  Total active users:', activeUsers.length);
  console.log('  Companies:', Object.keys(companyCounts).length);
  for (const [comp, cnt] of Object.entries(companyCounts).sort((a, b) => b[1] - a[1])) {
    console.log('    ' + comp + ': ' + cnt);
  }
}

verify();
