import { supabase } from './src/migration/supabase-client.js'
import fetch from 'node-fetch'
import dotenv from 'dotenv'

dotenv.config()

const BUBBLE_BASE_URL = process.env.BUBBLE_API_URL!
const BUBBLE_API_TOKEN = process.env.BUBBLE_API_TOKEN!

async function checkSubsectionsMigration() {
  console.log('=== Checking Subsections Migration Status ===\n')

  // Check Supabase subsections
  const { data: supabaseSubsections, error } = await supabase
    .from('subsections')
    .select('*')
    .limit(10)

  const errorMsg = error ? error.message : 'none'
  console.log(`Error: ${errorMsg}`)
  console.log(`Subsections in Supabase: ${supabaseSubsections ? supabaseSubsections.length : 0}`)

  if (supabaseSubsections && supabaseSubsections.length > 0) {
    console.log('\nSample subsection:')
    console.log(JSON.stringify(supabaseSubsections[0], null, 2))
  }

  // Check Bubble subsections
  console.log('\n=== Checking Bubble Subsections ===\n')

  const url = `${BUBBLE_BASE_URL}/api/1.1/obj/subsection?limit=10`
  const response = await fetch(url, {
    headers: { 'Authorization': `Bearer ${BUBBLE_API_TOKEN}` }
  })
  const data = await response.json() as any

  if (data.response) {
    console.log(`Total subsections in Bubble: ${data.response.count}`)

    if (data.response.results && data.response.results.length > 0) {
      console.log('\nSample Bubble subsection:')
      console.log(JSON.stringify(data.response.results[0], null, 2))
    }
  }
}

checkSubsectionsMigration()
