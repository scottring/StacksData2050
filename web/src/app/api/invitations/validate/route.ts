import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function POST(request: Request) {
  try {
    const { token } = await request.json()
    if (!token || typeof token !== 'string') {
      return NextResponse.json({ error: 'Token required' }, { status: 400 })
    }

    const service = getServiceClient()
    const { data, error } = await service
      .from('invitations')
      .select('id, email, company_name, company_id, request_id, accepted_at, expires_at')
      .eq('token', token)
      .maybeSingle()

    if (error) {
      console.error('Error validating invitation:', error)
      return NextResponse.json({ error: 'Lookup failed' }, { status: 500 })
    }

    if (!data) {
      return NextResponse.json({ error: 'Invalid invitation' }, { status: 404 })
    }

    if (data.accepted_at) {
      return NextResponse.json({ error: 'Invitation already accepted' }, { status: 410 })
    }

    if (new Date(data.expires_at) <= new Date()) {
      return NextResponse.json({ error: 'Invitation expired' }, { status: 410 })
    }

    const { accepted_at, expires_at, ...invitation } = data
    return NextResponse.json({ invitation })
  } catch (err: any) {
    console.error('Error validating invitation:', err)
    return NextResponse.json({ error: err.message || 'Failed to validate invitation' }, { status: 500 })
  }
}
