import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { FRAMEWORK_SEEDS } from '@/lib/compliance/seed'

export async function GET() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Try database first
  const { data: frameworks } = await supabase
    .from('regulatory_frameworks')
    .select('*')
    .eq('active', true)
    .order('code')

  if (frameworks && frameworks.length > 0) {
    return NextResponse.json({ frameworks })
  }

  // Fall back to seed data
  const seedFrameworks = FRAMEWORK_SEEDS.map(seed => ({
    code: seed.code,
    name: seed.name,
    jurisdiction: seed.jurisdiction,
    description: seed.description,
    version: seed.version,
    rule_count: seed.rules.length,
  }))

  return NextResponse.json({ frameworks: seedFrameworks })
}
