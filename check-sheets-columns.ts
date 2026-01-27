import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config({ path: './web/.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkSheetsColumns() {
  console.log('\n🔍 Checking Sheets Table Structure\n')
  console.log('='.repeat(60))

  // Get a sample sheet to see all columns
  const { data: sheet, error } = await supabase
    .from('sheets')
    .select('*')
    .limit(1)
    .single()

  if (error) {
    console.error('Error:', error)
    return
  }

  console.log('\nAvailable columns in sheets table:\n')
  Object.keys(sheet || {}).forEach(key => {
    console.log(`  - ${key}`)
  })

  // Check if there's a product_name or similar field
  console.log('\n\nLooking for product-related fields:')
  const productFields = Object.keys(sheet || {}).filter(key =>
    key.toLowerCase().includes('product') ||
    key.toLowerCase().includes('name') ||
    key.toLowerCase().includes('title')
  )

  if (productFields.length > 0) {
    console.log('\nFound product-related fields:')
    productFields.forEach(field => {
      console.log(`  ✅ ${field}: ${sheet[field]}`)
    })
  } else {
    console.log('\n⚠️ No obvious product name field found')
    console.log('\nMaybe use one of these for display:')
    const possibleFields = Object.keys(sheet || {}).filter(key =>
      typeof sheet[key] === 'string' && sheet[key]?.length > 0 && sheet[key]?.length < 100
    )
    possibleFields.slice(0, 5).forEach(field => {
      console.log(`  - ${field}: ${sheet[field]}`)
    })
  }
}

checkSheetsColumns().catch(console.error)
