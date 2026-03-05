/**
 * Bulk-accept normalization mappings with confidence >= 0.70
 *
 * Usage: cd stacks/web && npx tsx scripts/bulk-accept-mappings.ts
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL as string,
  process.env.SUPABASE_SERVICE_ROLE_KEY as string,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

async function main() {
  // Before state
  const { data: before } = await supabase
    .from('normalization_mappings')
    .select('status, confidence');

  const pending = (before || []).filter(m => m.status === 'pending');
  const willAccept = pending.filter(m => m.confidence >= 0.70);
  const willReject = pending.filter(m => m.confidence < 0.70 && m.confidence > 0);
  const noMatch = pending.filter(m => m.confidence === 0);

  console.log(`\n=== Bulk Accept Plan ===`);
  console.log(`Total mappings: ${(before || []).length}`);
  console.log(`Currently pending: ${pending.length}`);
  console.log(`Will ACCEPT (>= 0.70): ${willAccept.length}`);
  console.log(`Will REJECT (< 0.70, > 0): ${willReject.length}`);
  console.log(`Will mark NO_MATCH (= 0): ${noMatch.length}`);

  // Accept >= 0.70
  const { error: acceptErr, count: acceptCount } = await supabase
    .from('normalization_mappings')
    .update({ status: 'accepted', reviewed_at: new Date().toISOString() })
    .gte('confidence', 0.70)
    .eq('status', 'pending');

  if (acceptErr) throw acceptErr;
  console.log(`\nAccepted: ${acceptCount} mappings`);

  // Reject < 0.70 and > 0
  const { error: rejectErr, count: rejectCount } = await supabase
    .from('normalization_mappings')
    .update({ status: 'rejected', reviewed_at: new Date().toISOString() })
    .lt('confidence', 0.70)
    .gt('confidence', 0)
    .eq('status', 'pending');

  if (rejectErr) throw rejectErr;
  console.log(`Rejected: ${rejectCount} mappings`);

  // Mark no-match as rejected too
  const { error: noMatchErr, count: noMatchCount } = await supabase
    .from('normalization_mappings')
    .update({ status: 'rejected', reviewed_at: new Date().toISOString() })
    .eq('confidence', 0)
    .eq('status', 'pending');

  if (noMatchErr) throw noMatchErr;
  console.log(`Rejected (no match): ${noMatchCount} mappings`);

  // After state
  const { data: after } = await supabase
    .from('normalization_mappings')
    .select('status')
    .then(res => ({
      data: res.data?.reduce((acc: Record<string, number>, m) => {
        acc[m.status] = (acc[m.status] || 0) + 1;
        return acc;
      }, {})
    }));

  console.log(`\n=== Final State ===`);
  console.log(after);
}

main().catch(err => { console.error(err); process.exit(1); });
