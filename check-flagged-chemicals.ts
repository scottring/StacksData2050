import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config({ path: './web/.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkFlaggedChemicals() {
  console.log('\n🚨 Flagged Chemicals Report\n')
  console.log('='.repeat(60))

  // Get all flagged chemicals
  const { data: flagged } = await supabase
    .from('chemical_inventory')
    .select('chemical_name, cas_number, is_pfas, is_reach_svhc, is_prop65, risk_level, warnings, restrictions')
    .or('is_pfas.eq.true,is_reach_svhc.eq.true,is_prop65.eq.true,risk_level.eq.high,risk_level.eq.medium')
    .order('risk_level', { ascending: false })

  console.log(`\nFound ${flagged?.length} flagged chemicals:\n`)

  for (const chem of flagged || []) {
    console.log(`\n${chem.chemical_name} (${chem.cas_number})`)
    console.log(`  Risk Level: ${chem.risk_level?.toUpperCase()}`)

    const flags = []
    if (chem.is_pfas) flags.push('PFAS')
    if (chem.is_reach_svhc) flags.push('REACH SVHC')
    if (chem.is_prop65) flags.push('Prop 65')

    if (flags.length > 0) {
      console.log(`  Flags: ${flags.join(', ')}`)
    }

    if (chem.warnings && chem.warnings.length > 0) {
      console.log(`  Warnings:`)
      chem.warnings.forEach((w: string) => console.log(`    - ${w}`))
    }

    if (chem.restrictions && chem.restrictions.length > 0) {
      console.log(`  Restrictions:`)
      chem.restrictions.forEach((r: string) => console.log(`    - ${r}`))
    }
  }

  console.log('\n' + '='.repeat(60))
}

checkFlaggedChemicals().catch(console.error)
