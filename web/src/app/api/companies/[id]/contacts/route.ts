import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: companyId } = await params
    const supabase = getServiceClient()

    const { data: contacts } = await supabase
      .from('users')
      .select('id, email, full_name')
      .eq('company_id', companyId)
      .order('full_name')

    // Filter out placeholder emails and unknown names
    const validContacts = (contacts || []).filter(
      (c) =>
        c.email &&
        !c.email.includes('placeholder') &&
        c.full_name &&
        c.full_name !== 'Unknown'
    )

    return NextResponse.json(validContacts)
  } catch (error: any) {
    console.error('Error fetching contacts:', error)
    return NextResponse.json({ error: 'Failed to fetch contacts' }, { status: 500 })
  }
}
