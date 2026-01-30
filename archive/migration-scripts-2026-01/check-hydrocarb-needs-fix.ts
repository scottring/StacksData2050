import { supabase } from './src/migration/supabase-client.js'
import fetch from 'node-fetch'
import dotenv from 'dotenv'

dotenv.config()

const BUBBLE_BASE_URL = process.env.BUBBLE_API_URL!
const BUBBLE_API_TOKEN = process.env.BUBBLE_API_TOKEN!

async function checkHydrocarbNeedsFix() {
  console.log('=== Checking if HYDROCARB needs fixing ===\n')

  const versions = [
    { v: 2, id: '8222b70c-14dd-48ab-8ceb-e972c9d797c3', bubbleId: '1661440851034x545387418125598700' },
    { v: 3, id: 'fc48461e-7a18-4cb1-887e-1a3686244ef0', bubbleId: '1744099239597x968220647214809100' }
  ]

  for (const ver of versions) {
    console.log(`Version ${ver.v}:`)
    console.log(`  Sheet ID: ${ver.id}`)
    console.log(`  Bubble ID: ${ver.bubbleId}`)

    // Check Supabase
    const { count: supabaseCount } = await supabase
      .from('answers')
      .select('id', { count: 'exact', head: true })
      .eq('sheet_id', ver.id)

    console.log(`  Current answers in Supabase: ${supabaseCount}`)

    // Check Bubble
    const url = `${BUBBLE_BASE_URL}/api/1.1/obj/answer?constraints=[{"key":"Sheet","constraint_type":"equals","value":"${ver.bubbleId}"}]`
    const response = await fetch(url, {
      headers: { 'Authorization': `Bearer ${BUBBLE_API_TOKEN}` }
    })
    const data = await response.json() as any

    const bubbleCount = data.response?.count || 0
    console.log(`  Answers in Bubble: ${bubbleCount}`)

    if (bubbleCount > 0 && supabaseCount === 0) {
      console.log(`  ✓ NEEDS FIXING - has ${bubbleCount} answers in Bubble`)

      // Check if answers exist in Supabase with wrong sheet_id
      const sampleBubbleIds = data.response.results.slice(0, 5).map((a: any) => a._id)
      const { data: existingAnswers } = await supabase
        .from('answers')
        .select('id, sheet_id, bubble_id')
        .in('bubble_id', sampleBubbleIds)

      if (existingAnswers && existingAnswers.length > 0) {
        console.log(`  Found ${existingAnswers.length} answers with wrong sheet_id:`)
        for (const ans of existingAnswers) {
          const { data: wrongSheet } = await supabase
            .from('sheets')
            .select('name, version')
            .eq('id', ans.sheet_id)
            .single()

          if (wrongSheet) {
            console.log(`    - Currently points to: ${wrongSheet.name} (v${wrongSheet.version})`)
          }
        }
      } else {
        console.log(`  ⚠️  Answers don't exist in Supabase at all - need migration, not fix`)
      }
    }

    console.log()
  }
}

checkHydrocarbNeedsFix()
