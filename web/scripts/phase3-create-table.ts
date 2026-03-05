/**
 * Phase 3: Create canonical_answer_links table via Supabase REST API
 *
 * Usage: cd stacks/web && npx tsx scripts/phase3-create-table.ts
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY as string;

const sql = `
-- Phase 3: Canonical answer links
CREATE TABLE IF NOT EXISTS canonical_answer_links (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  answer_id               uuid NOT NULL REFERENCES answers(id),
  canonical_parameter_id  uuid NOT NULL REFERENCES canonical_parameters(id),
  normalization_mapping_id uuid REFERENCES normalization_mappings(id),
  created_at              timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cal_answer ON canonical_answer_links(answer_id);
CREATE INDEX IF NOT EXISTS idx_cal_canonical_param ON canonical_answer_links(canonical_parameter_id);
CREATE INDEX IF NOT EXISTS idx_cal_mapping ON canonical_answer_links(normalization_mapping_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_cal_unique_answer_param ON canonical_answer_links(answer_id, canonical_parameter_id);

ALTER TABLE canonical_answer_links ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'canonical_answer_links' AND policyname = 'Authenticated users can read canonical answer links'
  ) THEN
    CREATE POLICY "Authenticated users can read canonical answer links"
      ON canonical_answer_links FOR SELECT
      TO authenticated
      USING (true);
  END IF;
END $$;
`;

async function main() {
  // Use the Supabase SQL endpoint (via pg-meta)
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/`, {
    method: 'POST',
    headers: {
      'apikey': SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query: sql }),
  });

  if (!res.ok) {
    // Try the SQL endpoint directly via pg-meta
    console.log('REST rpc failed, trying pg-meta SQL endpoint...');
    const projectRef = SUPABASE_URL.replace('https://', '').split('.')[0];
    const pgMetaRes = await fetch(`https://${projectRef}.supabase.co/pg/query`, {
      method: 'POST',
      headers: {
        'apikey': SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: sql }),
    });

    if (!pgMetaRes.ok) {
      console.log('pg-meta also failed. Applying via Supabase dashboard SQL editor.');
      console.log('\nCopy and run this SQL in your Supabase dashboard SQL editor:');
      console.log('='.repeat(60));
      console.log(sql);
      console.log('='.repeat(60));
      console.log('\nOr apply the migration file:');
      console.log('supabase/migrations/20260304000003_canonical_answer_links.sql');
      return;
    }

    const result = await pgMetaRes.json();
    console.log('Table created via pg-meta:', result);
    return;
  }

  console.log('Table created successfully via RPC');
}

main().catch(err => { console.error(err); process.exit(1); });
