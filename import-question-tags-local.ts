/**
 * Import question-tag relationships to local Supabase
 */
import * as fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'http://127.0.0.1:54321',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU'
);

async function main() {
  // Load questions from Bubble export
  const questions = JSON.parse(fs.readFileSync('fresh-import/bubble-export/question.json', 'utf-8'));
  const tags = JSON.parse(fs.readFileSync('fresh-import/bubble-export/tag.json', 'utf-8'));

  // Build Bubble ID -> Supabase ID maps
  const { data: dbQuestions } = await supabase.from('questions').select('id, bubble_id');
  const { data: dbTags } = await supabase.from('tags').select('id, bubble_id');

  const questionMap = new Map(dbQuestions?.map(q => [q.bubble_id, q.id]) || []);
  const tagMap = new Map(dbTags?.map(t => [t.bubble_id, t.id]) || []);

  console.log('Questions in DB:', questionMap.size);
  console.log('Tags in DB:', tagMap.size);

  // Build question-tag relationships
  const relationships: { question_id: string; tag_id: string }[] = [];

  for (const q of questions) {
    const questionId = questionMap.get(q._id);
    if (!questionId) continue;

    const tagIds = q.Tags || [];
    for (const bubbleTagId of tagIds) {
      const tagId = tagMap.get(bubbleTagId);
      if (tagId) {
        relationships.push({ question_id: questionId, tag_id: tagId });
      }
    }
  }

  console.log('Found', relationships.length, 'question-tag relationships');

  // Insert in batches
  const batchSize = 100;
  for (let i = 0; i < relationships.length; i += batchSize) {
    const batch = relationships.slice(i, i + batchSize);
    const { error } = await supabase.from('question_tags').upsert(batch, {
      onConflict: 'question_id,tag_id',
      ignoreDuplicates: true
    });
    if (error) {
      console.error('Error inserting batch:', error.message);
    }
  }

  console.log('Imported question-tag relationships');

  // Also import sheet-tag relationships
  const sheets = JSON.parse(fs.readFileSync('fresh-import/bubble-export/sheet.json', 'utf-8'));
  const { data: dbSheets } = await supabase.from('sheets').select('id, bubble_id');
  const sheetMap = new Map(dbSheets?.map(s => [s.bubble_id, s.id]) || []);

  const sheetTagRelationships: { sheet_id: string; tag_id: string }[] = [];

  for (const s of sheets) {
    const sheetId = sheetMap.get(s._id);
    if (!sheetId) continue;

    const tagIds = s.tags || [];
    for (const bubbleTagId of tagIds) {
      const tagId = tagMap.get(bubbleTagId);
      if (tagId) {
        sheetTagRelationships.push({ sheet_id: sheetId, tag_id: tagId });
      }
    }
  }

  console.log('Found', sheetTagRelationships.length, 'sheet-tag relationships');

  for (let i = 0; i < sheetTagRelationships.length; i += batchSize) {
    const batch = sheetTagRelationships.slice(i, i + batchSize);
    const { error } = await supabase.from('sheet_tags').upsert(batch, {
      onConflict: 'sheet_id,tag_id',
      ignoreDuplicates: true
    });
    if (error) {
      console.error('Error inserting sheet-tag batch:', error.message);
    }
  }

  console.log('Imported sheet-tag relationships');
}

main();
