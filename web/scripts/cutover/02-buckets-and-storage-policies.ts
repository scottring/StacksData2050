/**
 * Cutover step 2: creates the two pipeline storage buckets on the TARGET
 * environment (private, 50MB limit) if absent, then prints the
 * storage.objects RLS SQL for manual application (the JS client cannot
 * create storage.objects policies; only the SQL editor or a linked CLI can).
 *
 * WRITES to whichever project SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY point
 * at. Run against prod ONLY as part of the cutover runbook (README.md step 3):
 *
 *   cd stacks/web
 *   CUTOVER_CONFIRM=yes npx tsx --env-file=../.env.production scripts/cutover/02-buckets-and-storage-policies.ts
 *
 * Never point this at prod outside a reviewed cutover run.
 */
import { createClient } from '@supabase/supabase-js'

if (process.env.CUTOVER_CONFIRM !== 'yes') {
  console.error('Refusing to run: set CUTOVER_CONFIRM=yes explicitly. This script writes to PRODUCTION.')
  process.exit(1)
}

const BUCKETS = ['extraction-documents', 'generated-documents'] as const
const FILE_SIZE_LIMIT_BYTES = 52428800 // 50 MB, matches scripts/verify-rebuild-prereqs.ts

const STORAGE_POLICY_SQL = `-- storage.objects RLS policies (source: supabase/migrations/20260706000002_pipeline_storage_policies.sql)
-- Run this in the target project's SQL editor, or via a CLI linked to that
-- project. Cannot be applied through the JS/service-role client.

-- extraction-documents: folder-per-user (storage path segment 1 = auth.uid())
DROP POLICY IF EXISTS "Users can upload their own extraction documents" ON storage.objects;
CREATE POLICY "Users can upload their own extraction documents"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'extraction-documents'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Users can view their own extraction documents" ON storage.objects;
CREATE POLICY "Users can view their own extraction documents"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'extraction-documents'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Users can delete their own extraction documents" ON storage.objects;
CREATE POLICY "Users can delete their own extraction documents"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'extraction-documents'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- generated-documents: folder-per-company (storage path segment 1 = company_id)
DROP POLICY IF EXISTS "Users can upload generated documents for their company" ON storage.objects;
CREATE POLICY "Users can upload generated documents for their company"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'generated-documents'
    AND (storage.foldername(name))[1] = (
      SELECT company_id::text FROM public.users WHERE id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can view generated documents for their company" ON storage.objects;
CREATE POLICY "Users can view generated documents for their company"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'generated-documents'
    AND (storage.foldername(name))[1] = (
      SELECT company_id::text FROM public.users WHERE id = auth.uid()
    )
  );
`

async function main() {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    console.error('Missing SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL) / SUPABASE_SERVICE_ROLE_KEY')
    process.exit(1)
  }

  console.log('=== 02-buckets-and-storage-policies ===')
  console.log(`Target SUPABASE_URL: ${url}`)
  console.log(`Service role key: ${key.slice(0, 8)}... (${key.length} chars)`)
  console.log('About to create (if absent): extraction-documents, generated-documents (private, 50MB)\n')

  const supabase = createClient(url, key)

  const { data: existingBuckets, error: listErr } = await supabase.storage.listBuckets()
  if (listErr) {
    console.error(`Failed to list buckets: ${listErr.message}`)
    process.exit(1)
  }

  let failures = 0
  for (const bucket of BUCKETS) {
    if (existingBuckets?.some((b) => b.name === bucket)) {
      console.log(`bucket already present, skipping: ${bucket}`)
      continue
    }
    const { error: createErr } = await supabase.storage.createBucket(bucket, {
      public: false,
      fileSizeLimit: FILE_SIZE_LIMIT_BYTES,
    })
    if (createErr) {
      console.error(`BUCKET CREATE FAILED ${bucket}: ${createErr.message}`)
      failures++
    } else {
      console.log(`bucket created: ${bucket} (private, 50MB limit)`)
    }
  }

  if (failures > 0) {
    console.error(`\n${failures} bucket creation(s) failed. Fix before continuing the runbook.`)
    process.exit(1)
  }

  console.log('\nBuckets step complete. Next: apply the storage.objects policies below manually.\n')
  console.log(STORAGE_POLICY_SQL)
}

main()
