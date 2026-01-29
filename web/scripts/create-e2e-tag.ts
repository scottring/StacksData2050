import { config } from "dotenv";
config({ path: ".env.local" });

import { createClient } from "@supabase/supabase-js";

async function main() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // 1. Create the e2e tag
  console.log('Creating e2e tag...');
  const { data: tag, error: tagError } = await supabase
    .from('tags')
    .insert({ name: 'e2e', description: 'End-to-end test questions' })
    .select()
    .single();
  
  if (tagError) {
    if (tagError.code === '23505') {
      console.log('Tag already exists, fetching...');
      const { data: existingTag } = await supabase
        .from('tags')
        .select()
        .eq('name', 'e2e')
        .single();
      if (!existingTag) throw new Error('Could not find or create e2e tag');
      console.log('Using existing tag:', existingTag.id);
      return await linkQuestions(supabase, existingTag.id);
    }
    throw tagError;
  }
  
  console.log('Created tag:', tag.id);
  await linkQuestions(supabase, tag.id);
}

async function linkQuestions(supabase: any, tagId: string) {
  // Get one question of each type
  const types = ['Single text line', 'Dropdown', 'List table', 'Select one Radio'];
  
  for (const type of types) {
    const { data: questions } = await supabase
      .from('questions')
      .select('id, content, response_type')
      .eq('response_type', type)
      .limit(1);
    
    if (questions && questions[0]) {
      const q = questions[0];
      console.log(`\nLinking ${type}: ${q.content?.slice(0, 40)}...`);
      
      const { error } = await supabase
        .from('question_tags')
        .insert({ question_id: q.id, tag_id: tagId });
      
      if (error && error.code !== '23505') {
        console.error('  Error:', error.message);
      } else {
        console.log('  Linked:', q.id);
      }
    }
  }
  
  console.log('\nDone! e2e tag ready with 4 questions.');
}

main().catch(console.error);
