import { supabase } from './src/migration/supabase-client.js'
import fetch from 'node-fetch'
import dotenv from 'dotenv'

dotenv.config()

const BUBBLE_BASE_URL = process.env.BUBBLE_API_URL!
const BUBBLE_API_TOKEN = process.env.BUBBLE_API_TOKEN!

async function analyzeTagsMigration() {
  console.log('=== Analyzing Tags Migration ===\n')

  // Check if tags table exists and has data
  const { data: tags, count: tagsCount } = await supabase
    .from('tags')
    .select('*', { count: 'exact' })
    .limit(5)

  console.log(`Tags in Supabase: ${tagsCount}`)
  if (tags && tags.length > 0) {
    console.log('\nSample tags:')
    for (const tag of tags) {
      console.log(`  ${tag.name} (ID: ${tag.id})`)
    }
  }

  // Check question-tag relationships
  console.log('\n\n=== Question-Tag Relationships ===\n')

  const { data: questionTags, count: qtCount } = await supabase
    .from('question_tags')
    .select('*', { count: 'exact' })
    .limit(5)

  console.log(`Question-tag links in Supabase: ${qtCount}`)
  if (questionTags && questionTags.length > 0) {
    console.log('\nSample question-tag links:')
    for (const qt of questionTags) {
      console.log(`  Question: ${qt.question_id}, Tag: ${qt.tag_id}`)
    }
  }

  // Check sheet-tag relationships
  console.log('\n\n=== Sheet-Tag Relationships ===\n')

  const { data: sheetTags, count: stCount } = await supabase
    .from('sheet_tags')
    .select('*', { count: 'exact' })
    .limit(5)

  console.log(`Sheet-tag links in Supabase: ${stCount}`)
  if (sheetTags && sheetTags.length > 0) {
    console.log('\nSample sheet-tag links:')
    for (const st of sheetTags) {
      console.log(`  Sheet: ${st.sheet_id}, Tag: ${st.tag_id}`)
    }
  }

  // Fetch some tags from Bubble
  console.log('\n\n=== Tags in Bubble ===\n')

  const url = `${BUBBLE_BASE_URL}/api/1.1/obj/tag?sort_field=Name&limit=10`
  const response = await fetch(url, {
    headers: { 'Authorization': `Bearer ${BUBBLE_API_TOKEN}` }
  })
  const data = await response.json() as any

  if (data.response && data.response.results) {
    console.log(`Found ${data.response.count} tags in Bubble\n`)
    console.log('Sample tags:')
    for (const tag of data.response.results) {
      console.log(`  ${tag.Name} (ID: ${tag._id})`)
      console.log(`    Version: ${tag.Version}`)
      console.log(`    Active: ${tag.Active}`)
    }
  }

  // Check HQ2.0.1 and HQ2.1 specifically
  console.log('\n\n=== Checking HQ Tags ===\n')

  const hqUrl = `${BUBBLE_BASE_URL}/api/1.1/obj/tag?constraints=[{"key":"Name","constraint_type":"text contains","value":"HQ2"}]`
  const hqResponse = await fetch(hqUrl, {
    headers: { 'Authorization': `Bearer ${BUBBLE_API_TOKEN}` }
  })
  const hqData = await hqResponse.json() as any

  if (hqData.response && hqData.response.results) {
    console.log(`Found ${hqData.response.count} HQ2 tags in Bubble:\n`)
    for (const tag of hqData.response.results) {
      console.log(`  ${tag.Name}`)
      console.log(`    ID: ${tag._id}`)
      console.log(`    Version: ${tag.Version}`)
      console.log(`    Active: ${tag.Active}`)

      // Check if migrated to Supabase
      const { data: supabaseTag } = await supabase
        .from('tags')
        .select('id, name')
        .eq('bubble_id', tag._id)
        .maybeSingle()

      if (supabaseTag) {
        console.log(`    ✓ Migrated to Supabase: ${supabaseTag.id}`)
      } else {
        console.log(`    ❌ NOT in Supabase`)
      }
      console.log()
    }
  }
}

analyzeTagsMigration()
