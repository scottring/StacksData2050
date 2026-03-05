/**
 * Phase 4: Migrate document attachments from Bubble S3 to Supabase Storage
 *
 * For UPM + Sappi answers that have File or Support File attachments:
 * 1. Fetch from Bubble API
 * 2. Map to Supabase answers via bubble_id on sheets/questions
 * 3. Download file from Bubble S3
 * 4. Upload to Supabase Storage (answer-files bucket)
 * 5. Create answer_documents record
 *
 * Non-destructive: only creates new storage files and answer_documents records.
 *
 * Usage: cd stacks/web && npx tsx scripts/phase4-migrate-documents.ts
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Load both env files
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL as string,
  process.env.SUPABASE_SERVICE_ROLE_KEY as string,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const BUBBLE_BASE_URL = process.env.BUBBLE_API_URL || 'https://app.stacksdata.com/version-live';
const BUBBLE_API_TOKEN = process.env.BUBBLE_API_TOKEN as string;

const UPM_BUBBLE = '1632528636558x671234562485387300';
const SAPPI_BUBBLE = '1632528459461x300654739299762200';

const STORAGE_BUCKET = 'answer-files';

async function bubbleGet(endpoint: string, constraints: any[], cursor = 0, limit = 100) {
  let url = `${BUBBLE_BASE_URL}/api/1.1/obj/${endpoint}?cursor=${cursor}&limit=${limit}`;
  url += `&constraints=${encodeURIComponent(JSON.stringify(constraints))}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${BUBBLE_API_TOKEN}` },
  });
  if (!res.ok) throw new Error(`Bubble ${res.status}: ${await res.text()}`);
  return res.json();
}

function extractFilename(url: string): string {
  try {
    const decoded = decodeURIComponent(url.split('/').pop() || 'unknown');
    return decoded;
  } catch {
    return url.split('/').pop() || 'unknown';
  }
}

function guessMimeType(filename: string): string {
  const ext = filename.toLowerCase().split('.').pop();
  const map: Record<string, string> = {
    pdf: 'application/pdf',
    doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    xls: 'application/vnd.ms-excel',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    gif: 'image/gif',
    txt: 'text/plain',
    csv: 'text/csv',
  };
  return map[ext || ''] || 'application/octet-stream';
}

function sanitizeStoragePath(p: string): string {
  // Replace special chars that break Supabase Storage keys
  return p
    .replace(/[%]/g, '_pct_')
    .replace(/[^a-zA-Z0-9_\-./]/g, '_')
    .replace(/__+/g, '_');
}

async function main() {
  console.log('=== Phase 4: Migrate Documents from Bubble to Supabase ===\n');

  // 1. Build lookup maps: bubble_id -> supabase_id for sheets and questions
  console.log('Building ID lookup maps...');
  const { data: sheets } = await supabase
    .from('sheets')
    .select('id, bubble_id')
    .not('bubble_id', 'is', null);
  const sheetMap = new Map((sheets || []).map(s => [s.bubble_id, s.id]));
  console.log(`  Sheet mappings: ${sheetMap.size}`);

  const { data: questions } = await supabase
    .from('questions')
    .select('id, bubble_id')
    .not('bubble_id', 'is', null);
  const questionMap = new Map((questions || []).map(q => [q.bubble_id, q.id]));
  console.log(`  Question mappings: ${questionMap.size}`);

  // 2. Fetch all Bubble answers with files for UPM + Sappi
  console.log('\nFetching Bubble answers with file attachments...');

  interface DocToMigrate {
    bubbleAnswerId: string;
    fileUrl: string;
    docType: 'file' | 'support_file';
    bubbleSheetId: string | null;
    bubbleQuestionId: string;
  }

  const docsToMigrate: DocToMigrate[] = [];

  for (const [customerName, customerId] of [['UPM', UPM_BUBBLE], ['Sappi', SAPPI_BUBBLE]]) {
    for (const [fieldName, docType] of [['File', 'file'], ['Support File', 'support_file']] as const) {
      let cursor = 0;
      let hasMore = true;

      while (hasMore) {
        const res = await bubbleGet('answer', [
          { key: fieldName, constraint_type: 'is_not_empty' },
          { key: 'Shareable with', constraint_type: 'contains', value: customerId }
        ], cursor, 100);

        for (const answer of res.response.results || []) {
          docsToMigrate.push({
            bubbleAnswerId: answer._id,
            fileUrl: answer[fieldName],
            docType: docType as 'file' | 'support_file',
            bubbleSheetId: answer.Sheet || null,
            bubbleQuestionId: answer['Parent Question'],
          });
        }

        const remaining = res.response.remaining || 0;
        if (remaining > 0) {
          cursor += (res.response.results?.length || 0);
        } else {
          hasMore = false;
        }
      }

      const count = docsToMigrate.filter(d =>
        d.docType === docType
      ).length;
      // This is cumulative, but gives progress
    }
    console.log(`  ${customerName}: fetched`);
  }

  console.log(`\nTotal documents to migrate: ${docsToMigrate.length}`);

  // 3. Resolve Bubble IDs to Supabase IDs and download/upload
  let migrated = 0;
  let skipped = 0;
  let failed = 0;
  let noMapping = 0;

  console.log('\nMigrating documents...\n');

  for (let i = 0; i < docsToMigrate.length; i++) {
    const doc = docsToMigrate[i];

    // Resolve sheet and question IDs
    const supabaseSheetId = doc.bubbleSheetId ? sheetMap.get(doc.bubbleSheetId) : null;
    const supabaseQuestionId = questionMap.get(doc.bubbleQuestionId);

    if (!supabaseQuestionId) {
      noMapping++;
      continue;
    }

    // Find the Supabase answer
    let query = supabase
      .from('answers')
      .select('id')
      .eq('question_id', supabaseQuestionId);

    if (supabaseSheetId) {
      query = query.eq('sheet_id', supabaseSheetId);
    }

    const { data: answers } = await query.limit(1);
    const supabaseAnswerId = answers?.[0]?.id;

    if (!supabaseAnswerId) {
      noMapping++;
      continue;
    }

    // Check if already migrated (match by answer + original filename)
    const origFilename = extractFilename(doc.fileUrl);
    const { data: existing } = await supabase
      .from('answer_documents')
      .select('id')
      .eq('answer_id', supabaseAnswerId)
      .eq('filename', origFilename)
      .limit(1);

    if (existing && existing.length > 0) {
      skipped++;
      continue;
    }

    // Download file from Bubble
    const filename = extractFilename(doc.fileUrl);
    const mimeType = guessMimeType(filename);

    try {
      // Bubble files require api_token as query parameter
      const sep = doc.fileUrl.includes('?') ? '&' : '?';
      const authUrl = `${doc.fileUrl}${sep}api_token=${BUBBLE_API_TOKEN}`;
      const fileRes = await fetch(authUrl);
      if (!fileRes.ok) {
        console.log(`  FAIL download: ${doc.fileUrl.slice(0, 80)} (${fileRes.status})`);
        failed++;
        continue;
      }

      const buffer = Buffer.from(await fileRes.arrayBuffer());
      const safeName = sanitizeStoragePath(filename);
      const storagePath = `${supabaseAnswerId}/${doc.docType}/${safeName}`;

      // Upload to Supabase Storage
      const { error: uploadErr } = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(storagePath, buffer, {
          contentType: mimeType,
          upsert: true,
        });

      if (uploadErr) {
        console.log(`  FAIL upload: ${storagePath} (${uploadErr.message})`);
        failed++;
        continue;
      }

      // Get the public URL
      const { data: urlData } = supabase.storage
        .from(STORAGE_BUCKET)
        .getPublicUrl(storagePath);

      // Create answer_documents record (document_type=null to pass check constraint)
      const { error: insertErr } = await supabase
        .from('answer_documents')
        .insert({
          answer_id: supabaseAnswerId,
          file_url: urlData.publicUrl,
          filename: filename,
          mime_type: mimeType,
          file_size: buffer.length,
          document_type: null,
        });

      if (insertErr) {
        console.log(`  FAIL insert: ${insertErr.message}`);
        failed++;
        continue;
      }

      migrated++;
    } catch (e: any) {
      console.log(`  ERROR: ${e.message.slice(0, 80)}`);
      failed++;
    }

    if ((i + 1) % 25 === 0 || i === docsToMigrate.length - 1) {
      process.stdout.write(`\r  Progress: ${i + 1}/${docsToMigrate.length} | Migrated: ${migrated} | Skipped: ${skipped} | No mapping: ${noMapping} | Failed: ${failed}`);
    }
  }

  console.log('\n\n=== Migration Summary ===');
  console.log(`Total attempted: ${docsToMigrate.length}`);
  console.log(`Successfully migrated: ${migrated}`);
  console.log(`Skipped (already exists): ${skipped}`);
  console.log(`No mapping (missing sheet/question/answer): ${noMapping}`);
  console.log(`Failed (download/upload error): ${failed}`);

  // Verify
  const { count: docCount } = await supabase
    .from('answer_documents')
    .select('id', { count: 'exact', head: true });
  console.log(`\nanswer_documents total: ${docCount}`);

  const { data: storageBuckets } = await supabase.storage.from(STORAGE_BUCKET).list('', { limit: 1 });
  console.log(`Storage bucket has files: ${(storageBuckets?.length || 0) > 0}`);

  // Verify existing tables unchanged
  const { count: answerCount } = await supabase.from('answers').select('id', { count: 'exact', head: true });
  const { count: questionCount } = await supabase.from('questions').select('id', { count: 'exact', head: true });
  const { count: sheetCount } = await supabase.from('sheets').select('id', { count: 'exact', head: true });
  console.log(`\nanswers: ${answerCount} (expected: 84954)`);
  console.log(`questions: ${questionCount} (expected: 201)`);
  console.log(`sheets: ${sheetCount} (expected: 775)`);
}

main().catch(err => { console.error(err); process.exit(1); });
