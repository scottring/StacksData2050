import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function GET() {
  try {
    const authClient = await createServerClient()
    const { data: { user } } = await authClient.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const service = getServiceClient()
    const { data: companies, error } = await service
      .from('companies')
      .select('id, name')
      .order('name')

    if (error) throw error

    return NextResponse.json(companies || [])
  } catch (error: any) {
    console.error('Error listing suppliers:', error)
    return NextResponse.json({ error: 'Failed to list suppliers' }, { status: 500 })
  }
}
