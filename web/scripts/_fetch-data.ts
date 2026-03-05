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
const [qRes, secRes, subRes] = await Promise.all([
  supabase.from('questions')
    .select('id, content, name, section_sort_number, subsection_sort_number, order_number, subsection_id')
    .order('section_sort_number').order('subsection_sort_number').order('order_number'),
  supabase.from('sections').select('id, name'),
  supabase.from('subsections').select('id, name, section_id'),
]);

const sectionMap = new Map((secRes.data || []).map((s: any) => [s.id, s.name]));
const subsectionMap = new Map((subRes.data || []).map((s: any) => [s.id, { name: s.name, section_id: s.section_id }]));

const questions = (qRes.data || []).map((q: any) => {
  const sub = subsectionMap.get(q.subsection_id);
  return {
    id: q.id,
    text: q.content || q.name || '(no text)',
    section: sub ? sectionMap.get(sub.section_id) || '?' : '?',
    subsection: sub?.name || '?',
    number: (q.section_sort_number && q.subsection_sort_number && q.order_number)
      ? `${q.section_sort_number}.${q.subsection_sort_number}.${q.order_number}`
      : '?',
  };
});

const { data: params } = await supabase
  .from('canonical_parameters')
  .select('id, code, section, subsection, name, answer_type_code, answer_pattern')
  .order('sort_order');

console.log(JSON.stringify({ questions, params }, null, 2));
}

main().catch(err => { console.error(err); process.exit(1); });
