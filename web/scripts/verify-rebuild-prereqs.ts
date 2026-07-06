/**
 * Verifies (and where safe, creates) the data prerequisites for the v2 surfaces.
 * Rerunnable. Run: npx tsx --env-file=.env.local scripts/verify-rebuild-prereqs.ts
 * Uses the service role key. Points at whichever Supabase the env file names.
 */
import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}
const supabase = createClient(url, key)

const REQUIRED_TABLES = [
  'extraction_documents', 'extraction_items',
  'regulatory_frameworks', 'regulatory_rules',
  'compliance_assessments', 'compliance_results',
  'generated_documents',
  'canonical_parameters', 'normalization_mappings',
]
// extraction upload writes to the first; documents/generate.ts uploads to the second
const BUCKETS = ['extraction-documents', 'generated-documents']

async function main() {
  let failures = 0

  for (const table of REQUIRED_TABLES) {
    const { count, error } = await supabase
      .from(table)
      .select('*', { count: 'exact', head: true })
    if (error) {
      console.error(`TABLE MISSING  ${table}: ${error.message}`)
      failures++
    } else {
      console.log(`table ok       ${table} (${count ?? 0} rows)`)
    }
  }

  const { data: buckets, error: bucketErr } = await supabase.storage.listBuckets()
  if (bucketErr) {
    console.error(`BUCKET CHECK FAILED: ${bucketErr.message}`)
    failures++
  } else {
    for (const bucket of BUCKETS) {
      if (buckets.some((b) => b.name === bucket)) {
        console.log(`bucket ok      ${bucket}`)
        continue
      }
      const { error: createErr } = await supabase.storage.createBucket(bucket, {
        public: false,
        fileSizeLimit: 52428800, // 50 MB
      })
      if (createErr) {
        console.error(`BUCKET CREATE FAILED ${bucket}: ${createErr.message}`)
        failures++
      } else {
        console.log(`bucket created ${bucket}`)
      }
    }
  }

  if (failures > 0) {
    console.error(`\n${failures} prerequisite(s) missing. Fix before runtime verification.`)
    process.exit(1)
  }
  console.log('\nAll rebuild prerequisites satisfied.')
}

main()
