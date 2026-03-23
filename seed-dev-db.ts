/**
 * Seed Dev Database
 *
 * Copies structural data (sections, subsections, questions, choices, tags,
 * list_tables, list_table_columns, question_tags) from PRODUCTION to DEV,
 * then creates test companies, users, and sheets.
 *
 * Usage:
 *   cd stacks
 *   npx tsx seed-dev-db.ts
 *
 * Env files:
 *   .env            -- DEV credentials (default)
 *   .env.production -- PRODUCTION credentials (read-only source)
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load dev env (default)
dotenv.config({ path: path.resolve(__dirname, '.env') });

// Load production env separately
const prodEnv = dotenv.config({
  path: path.resolve(__dirname, '.env.production'),
  override: false,
});

// ---- Clients ----

const PROD_URL = 'https://yrguoooxamecsjtkfqcw.supabase.co';
const PROD_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlyZ3Vvb294YW1lY3NqdGtmcWN3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDYxNjQ1OSwiZXhwIjoyMDgwMTkyNDU5fQ.vJjf-cGgyumKE2nPec1-vOik3lFn7lvlQM0xcNiiPbk';

const DEV_URL = process.env.SUPABASE_URL!;
const DEV_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!DEV_URL || !DEV_KEY) {
  console.error('Missing DEV env vars. Ensure .env has SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const prod = createClient(PROD_URL, PROD_KEY, {
  auth: { persistSession: false },
});

const dev = createClient(DEV_URL, DEV_KEY, {
  auth: { persistSession: false },
});

// ---- Helpers ----

async function fetchAll(client: SupabaseClient, table: string, select = '*', options?: { order?: string }) {
  const pageSize = 1000;
  let allData: any[] = [];
  let from = 0;
  let hasMore = true;

  while (hasMore) {
    let query = client.from(table).select(select).range(from, from + pageSize - 1);
    if (options?.order) {
      query = query.order(options.order);
    }
    const { data, error } = await query;
    if (error) throw new Error(`Failed to fetch ${table}: ${error.message}`);
    if (!data || data.length === 0) {
      hasMore = false;
    } else {
      allData = allData.concat(data);
      from += pageSize;
      if (data.length < pageSize) hasMore = false;
    }
  }

  return allData;
}

/**
 * Strip columns from rows that don't exist in the dev table.
 * Detects missing columns by parsing Supabase error messages and retrying.
 */
async function upsertBatch(table: string, rows: any[], batchSize = 500) {
  if (rows.length === 0) return 0;
  let total = 0;
  let strippedCols = new Set<string>();

  // Try a single-row probe first to detect column mismatches
  let probeRow = { ...rows[0] };
  let retries = 0;
  while (retries < 10) {
    const { error } = await dev.from(table).upsert(probeRow, { onConflict: 'id' });
    if (!error) {
      total++;
      break;
    }
    const colMatch = error.message.match(/Could not find the '(\w+)' column/);
    if (colMatch) {
      const badCol = colMatch[1];
      strippedCols.add(badCol);
      delete probeRow[badCol];
      retries++;
    } else {
      // Non-column error on probe, just skip it
      console.error(`  Probe error in ${table}: ${error.message}`);
      break;
    }
  }

  if (strippedCols.size > 0) {
    log(`  Stripping columns not in dev schema: ${[...strippedCols].join(', ')}`);
  }

  // Strip discovered bad columns from all rows
  const cleanRows = rows.map((row, idx) => {
    if (idx === 0 && retries < 10) return null; // already upserted probe row
    const clean = { ...row };
    for (const col of strippedCols) delete clean[col];
    return clean;
  }).filter(Boolean);

  for (let i = 0; i < cleanRows.length; i += batchSize) {
    const batch = cleanRows.slice(i, i + batchSize);
    const { error } = await dev.from(table).upsert(batch, { onConflict: 'id' });
    if (error) {
      console.error(`  Error upserting ${table} batch ${i}: ${error.message}`);
      // Try one-by-one for this batch
      for (const row of batch) {
        const { error: singleErr } = await dev.from(table).upsert(row, { onConflict: 'id' });
        if (singleErr) {
          console.error(`  Skip row in ${table}: ${singleErr.message}`);
        } else {
          total++;
        }
      }
    } else {
      total += batch.length;
    }
  }

  return total;
}

function log(msg: string) {
  console.log(`[seed] ${msg}`);
}

// ---- Copy structural data ----

async function copyTable(table: string, select = '*', options?: { order?: string }) {
  log(`Copying ${table}...`);
  const rows = await fetchAll(prod, table, select, options);
  if (rows.length === 0) {
    log(`  ${table}: 0 rows (empty in production)`);
    return 0;
  }
  const count = await upsertBatch(table, rows);
  log(`  ${table}: ${count}/${rows.length} rows copied`);
  return count;
}

async function seedStructuralData() {
  log('=== Copying structural data from PRODUCTION to DEV ===');

  // Order matters for FK dependencies
  // These tables may not exist in production -- skip gracefully
  for (const optionalTable of ['associations', 'stacks']) {
    try {
      await copyTable(optionalTable);
    } catch (err: any) {
      log(`  ${optionalTable}: skipped (${err.message})`);
    }
  }

  // Copy association_companies junction (may not exist)
  try {
    log('Copying association_companies...');
    const assocCompanies = await fetchAll(prod, 'association_companies');
    if (assocCompanies.length > 0) {
      for (let i = 0; i < assocCompanies.length; i += 500) {
        const batch = assocCompanies.slice(i, i + 500);
        const { error } = await dev.from('association_companies').upsert(batch, {
          onConflict: 'association_id,company_id',
        });
        if (error) console.error(`  association_companies error: ${error.message}`);
      }
      log(`  association_companies: ${assocCompanies.length} rows`);
    }
  } catch (err: any) {
    log(`  association_companies: skipped (${err.message})`);
  }

  // Core structural tables -- skip any that don't exist in production
  const structuralTables = [
    'tags', 'list_tables', 'sections', 'subsections',
    'questions', 'choices', 'list_table_columns',
  ];
  for (const table of structuralTables) {
    try {
      await copyTable(table);
    } catch (err: any) {
      log(`  ${table}: skipped (${err.message})`);
    }
  }

  // Junction tables
  log('Copying junction tables...');

  const junctions = [
    { table: 'question_tags', conflict: 'question_id,tag_id' },
    { table: 'section_questions', conflict: 'section_id,question_id' },
    { table: 'tag_hidden_companies', conflict: 'tag_id,company_id' },
    { table: 'stack_sections', conflict: 'stack_id,section_id' },
    { table: 'tag_stacks', conflict: 'tag_id,stack_id' },
    { table: 'question_choices', conflict: 'question_id,choice_id' },
  ];

  for (const { table, conflict } of junctions) {
    try {
      const rows = await fetchAll(prod, table);
      if (rows.length > 0) {
        for (let i = 0; i < rows.length; i += 500) {
          const batch = rows.slice(i, i + 500);
          const { error } = await dev.from(table).upsert(batch, { onConflict: conflict });
          if (error) console.error(`  ${table} error: ${error.message}`);
        }
        log(`  ${table}: ${rows.length} rows`);
      } else {
        log(`  ${table}: 0 rows`);
      }
    } catch (err: any) {
      log(`  ${table}: skipped (${err.message})`);
    }
  }

  // Copy canonical_parameters if they exist
  try {
    const params = await fetchAll(prod, 'canonical_parameters');
    if (params.length > 0) {
      await upsertBatch('canonical_parameters', params);
      log(`  canonical_parameters: ${params.length} rows`);

      // Copy canonical_parameter_tags
      const paramTags = await fetchAll(prod, 'canonical_parameter_tags');
      if (paramTags.length > 0) {
        for (let i = 0; i < paramTags.length; i += 500) {
          const batch = paramTags.slice(i, i + 500);
          await dev.from('canonical_parameter_tags').upsert(batch, {
            onConflict: 'tag_id,canonical_parameter_id',
          });
        }
        log(`  canonical_parameter_tags: ${paramTags.length} rows`);
      }
    }
  } catch (err: any) {
    log(`  canonical_parameters: skipped (${err.message})`);
  }
}

// ---- Create test data ----

async function createTestData() {
  log('');
  log('=== Creating test data ===');

  // 1. Create test companies
  log('Creating test companies...');

  const { data: customerCo, error: custErr } = await dev
    .from('companies')
    .upsert(
      {
        name: 'Dev Customer Co',
        name_lower_case: 'dev customer co',
        email_suffix: 'devcustomer.test',
        active: true,
        show_as_supplier: false,
      },
      { onConflict: 'name' }
    )
    .select('id')
    .single();

  if (custErr) {
    // Name is not unique constraint, try insert
    const { data: existing } = await dev
      .from('companies')
      .select('id')
      .eq('name', 'Dev Customer Co')
      .single();

    if (existing) {
      log(`  Dev Customer Co already exists: ${existing.id}`);
      var customerCoId = existing.id;
    } else {
      const { data: inserted, error: insertErr } = await dev
        .from('companies')
        .insert({
          name: 'Dev Customer Co',
          name_lower_case: 'dev customer co',
          email_suffix: 'devcustomer.test',
          active: true,
          show_as_supplier: false,
        })
        .select('id')
        .single();
      if (insertErr) throw new Error(`Failed to create customer company: ${insertErr.message}`);
      var customerCoId = inserted!.id;
    }
  } else {
    var customerCoId = customerCo!.id;
  }

  const { data: supplierCo } = await dev
    .from('companies')
    .select('id')
    .eq('name', 'Dev Supplier Co')
    .single();

  let supplierCoId: string;
  if (supplierCo) {
    supplierCoId = supplierCo.id;
    log(`  Dev Supplier Co already exists: ${supplierCoId}`);
  } else {
    const { data: inserted, error: insertErr } = await dev
      .from('companies')
      .insert({
        name: 'Dev Supplier Co',
        name_lower_case: 'dev supplier co',
        email_suffix: 'devsupplier.test',
        active: true,
        show_as_supplier: true,
      })
      .select('id')
      .single();
    if (insertErr) throw new Error(`Failed to create supplier company: ${insertErr.message}`);
    supplierCoId = inserted!.id;
  }

  log(`  Customer Co: ${customerCoId}`);
  log(`  Supplier Co: ${supplierCoId}`);

  // 2. Create test auth users
  log('Creating test auth users...');

  const testUsers = [
    {
      email: 'admin@devcustomer.test',
      firstName: 'Dev',
      lastName: 'Admin',
      companyId: customerCoId,
      role: 'admin' as const,
      isSuperAdmin: true,
    },
    {
      email: 'editor@devcustomer.test',
      firstName: 'Dev',
      lastName: 'Editor',
      companyId: customerCoId,
      role: 'editor' as const,
      isSuperAdmin: false,
    },
    {
      email: 'supplier@devsupplier.test',
      firstName: 'Dev',
      lastName: 'Supplier',
      companyId: supplierCoId,
      role: 'editor' as const,
      isSuperAdmin: false,
    },
  ];

  const createdUserIds: string[] = [];

  for (const u of testUsers) {
    // Check if auth user exists
    const { data: existingUsers } = await dev.auth.admin.listUsers();
    const existing = existingUsers?.users?.find((eu: any) => eu.email === u.email);

    let authUserId: string;
    if (existing) {
      authUserId = existing.id;
      log(`  Auth user ${u.email} already exists: ${authUserId}`);
    } else {
      const { data: authUser, error: authErr } = await dev.auth.admin.createUser({
        email: u.email,
        password: 'dev2026',
        email_confirm: true,
        user_metadata: {
          first_name: u.firstName,
          last_name: u.lastName,
        },
      });

      if (authErr) {
        console.error(`  Failed to create auth user ${u.email}: ${authErr.message}`);
        continue;
      }
      authUserId = authUser.user.id;
      log(`  Created auth user ${u.email}: ${authUserId}`);
    }

    createdUserIds.push(authUserId);

    // Upsert into public.users
    const { error: userErr } = await dev.from('users').upsert(
      {
        id: authUserId,
        email: u.email,
        first_name: u.firstName,
        last_name: u.lastName,
        full_name: `${u.firstName} ${u.lastName}`,
        company_id: u.companyId,
        role: u.role,
        is_super_admin: u.isSuperAdmin,
        profile_done: true,
      },
      { onConflict: 'id' }
    );

    if (userErr) {
      console.error(`  Failed to upsert user row for ${u.email}: ${userErr.message}`);
    } else {
      log(`  User row upserted: ${u.email} (${u.role}${u.isSuperAdmin ? ', super_admin' : ''})`);
    }
  }

  // 3. Create test sheets
  log('Creating test sheets...');

  // Find the first tag to associate (e.g. HQ2.1 or whatever exists)
  const { data: firstTag } = await dev
    .from('tags')
    .select('id, name')
    .order('name')
    .limit(1)
    .single();

  const adminUserId = createdUserIds[0];

  const testSheets = [
    {
      name: 'Test Product Alpha',
      company_id: supplierCoId,
      requesting_company_id: customerCoId,
      status: 'draft',
      new_status: 'Not started',
      version: 1,
      created_by: adminUserId,
    },
    {
      name: 'Test Product Beta',
      company_id: supplierCoId,
      requesting_company_id: customerCoId,
      status: 'draft',
      new_status: 'In progress',
      version: 1,
      created_by: adminUserId,
    },
    {
      name: 'Test Product Gamma',
      company_id: supplierCoId,
      requesting_company_id: customerCoId,
      status: 'submitted',
      new_status: 'Submitted',
      version: 1,
      created_by: adminUserId,
    },
  ];

  for (const sheet of testSheets) {
    const { data: existing } = await dev
      .from('sheets')
      .select('id')
      .eq('name', sheet.name)
      .single();

    if (existing) {
      log(`  Sheet "${sheet.name}" already exists: ${existing.id}`);
      continue;
    }

    const { data: inserted, error: sheetErr } = await dev
      .from('sheets')
      .insert(sheet)
      .select('id')
      .single();

    if (sheetErr) {
      console.error(`  Failed to create sheet "${sheet.name}": ${sheetErr.message}`);
      continue;
    }

    log(`  Created sheet "${sheet.name}": ${inserted!.id}`);

    // Link tag to sheet if we found one
    if (firstTag && inserted) {
      await dev.from('sheet_tags').upsert(
        { sheet_id: inserted.id, tag_id: firstTag.id },
        { onConflict: 'sheet_id,tag_id' }
      );
    }

    // Link all questions with that tag to the sheet
    if (firstTag && inserted) {
      const { data: tagQuestions } = await dev
        .from('question_tags')
        .select('question_id')
        .eq('tag_id', firstTag.id);

      if (tagQuestions && tagQuestions.length > 0) {
        const sheetQuestions = tagQuestions.map((qt: any, idx: number) => ({
          sheet_id: inserted.id,
          question_id: qt.question_id,
          order_number: idx,
        }));

        for (let i = 0; i < sheetQuestions.length; i += 500) {
          const batch = sheetQuestions.slice(i, i + 500);
          await dev.from('sheet_questions').upsert(batch, {
            onConflict: 'sheet_id,question_id',
          });
        }
        log(`    Linked ${tagQuestions.length} questions (tag: ${firstTag.name})`);
      }
    }
  }

  // 4. Create a test request
  log('Creating test request...');

  const { data: firstSheet } = await dev
    .from('sheets')
    .select('id')
    .eq('name', 'Test Product Alpha')
    .single();

  if (firstSheet) {
    const { data: existingReq } = await dev
      .from('requests')
      .select('id')
      .eq('sheet_id', firstSheet.id)
      .limit(1)
      .single();

    if (!existingReq) {
      const { data: req, error: reqErr } = await dev
        .from('requests')
        .insert({
          sheet_id: firstSheet.id,
          owner_company_id: customerCoId,
          reader_company_id: supplierCoId,
          requestor_id: customerCoId,
          requesting_from_id: supplierCoId,
          status: 'Created',
          created_by: adminUserId,
        })
        .select('id')
        .single();

      if (reqErr) {
        console.error(`  Failed to create request: ${reqErr.message}`);
      } else {
        log(`  Created request: ${req!.id}`);
      }
    } else {
      log(`  Request already exists for sheet: ${existingReq.id}`);
    }
  }

  // 5. Create sheet_statuses for test sheets
  log('Creating sheet statuses...');
  const { data: allTestSheets } = await dev
    .from('sheets')
    .select('id, name, company_id, requesting_company_id, new_status')
    .in('name', ['Test Product Alpha', 'Test Product Beta', 'Test Product Gamma']);

  if (allTestSheets) {
    for (const s of allTestSheets) {
      const { data: existingStatus } = await dev
        .from('sheet_statuses')
        .select('id')
        .eq('sheet_id', s.id)
        .limit(1)
        .single();

      if (!existingStatus) {
        await dev.from('sheet_statuses').insert({
          sheet_name: s.name,
          sheet_id: s.id,
          company_id: s.requesting_company_id,
          supplier_id: s.company_id,
          status: s.new_status || 'Not started',
          version: 1,
          created_by: adminUserId,
        });
        log(`  Created status for "${s.name}"`);
      }
    }
  }
}

// ---- Main ----

async function main() {
  log('Starting dev database seed...');
  log(`Production: ${PROD_URL}`);
  log(`Dev: ${DEV_URL}`);
  log('');

  try {
    await seedStructuralData();
    await createTestData();

    log('');
    log('=== Seed complete ===');
    log('');
    log('Test accounts (password: dev2026):');
    log('  admin@devcustomer.test    -- Super admin, Dev Customer Co');
    log('  editor@devcustomer.test   -- Editor, Dev Customer Co');
    log('  supplier@devsupplier.test -- Editor, Dev Supplier Co');
  } catch (err) {
    console.error('Seed failed:', err);
    process.exit(1);
  }
}

main();
