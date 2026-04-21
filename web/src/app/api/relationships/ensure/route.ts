import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { companiesHaveRelationship } from '@/lib/auth/has-relationship'

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function POST(request: Request) {
  try {
    const { supplierCompanyId } = await request.json()

    if (!supplierCompanyId || typeof supplierCompanyId !== 'string') {
      return NextResponse.json({ error: 'supplierCompanyId required' }, { status: 400 })
    }

    const authClient = await createServerClient()
    const { data: { user } } = await authClient.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const service = getServiceClient()

    const { data: userData } = await service
      .from('users')
      .select('company_id')
      .eq('id', user.id)
      .single()

    if (!userData?.company_id) {
      return NextResponse.json({ error: 'No company found for user' }, { status: 400 })
    }

    if (userData.company_id === supplierCompanyId) {
      return NextResponse.json(
        { error: 'Cannot create a relationship with your own company' },
        { status: 400 }
      )
    }

    const alreadyConnected = await companiesHaveRelationship(
      service,
      userData.company_id,
      supplierCompanyId
    )

    if (alreadyConnected) {
      return NextResponse.json(
        { alreadyConnected: true, error: 'Already connected to this supplier' },
        { status: 409 }
      )
    }

    const { data: newRequest, error: requestError } = await service
      .from('requests')
      .insert({
        requestor_id: userData.company_id,
        requesting_from_id: supplierCompanyId,
        sheet_id: null,
        processed: false,
        created_by: user.id,
      })
      .select()
      .single()

    if (requestError) throw requestError

    return NextResponse.json({ request: newRequest, alreadyConnected: false })
  } catch (error: any) {
    console.error('Error ensuring relationship:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create relationship' },
      { status: 500 }
    )
  }
}
