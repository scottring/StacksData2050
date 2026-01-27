import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'

// Create a Supabase client with service role for admin operations
function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      persistSession: false,
    },
  })
}

export async function GET() {
  try {
    // Use the server client to check auth (handles cookies automatically)
    const supabase = await createServerClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is super admin
    const { data: isSuperAdmin } = await supabase.rpc('is_super_admin')

    if (!isSuperAdmin) {
      return NextResponse.json({ error: 'Forbidden: Super admin only' }, { status: 403 })
    }

    // Use service role client to bypass RLS
    const adminClient = createAdminClient()

    // Fetch all data without RLS restrictions
    // Fetch in batches because PostgREST has max rows limit
    let allSheets: any[] = []
    let page = 0
    const PAGE_SIZE = 1000

    while (true) {
      const start = page * PAGE_SIZE
      const end = start + PAGE_SIZE - 1

      const { data, error } = await adminClient
        .from('sheets')
        .select('id, name, status, company_id, requesting_company_id, created_at, modified_at')
        .range(start, end)

      if (error) {
        console.error('Error fetching sheets page', page, error)
        break
      }

      if (!data || data.length === 0) break

      allSheets = allSheets.concat(data)

      if (data.length < PAGE_SIZE) break

      page++

      // Safety check to prevent infinite loop
      if (page > 10) {
        console.warn('Hit page limit safety check')
        break
      }
    }

    const [companiesResult, usersResult, authUsersResult] = await Promise.all([
      adminClient
        .from('companies')
        .select('id, name')
        .range(0, 9999),
      adminClient
        .from('users')
        .select('id, company_id')
        .range(0, 9999),
      adminClient.auth.admin.listUsers({ perPage: 1000 })
    ])

    const sheetsResult = { data: allSheets, error: null }

    if (sheetsResult.error) {
      console.error('Sheets query error:', sheetsResult.error)
      return NextResponse.json({ error: 'Failed to fetch sheets' }, { status: 500 })
    }

    if (companiesResult.error) {
      console.error('Companies query error:', companiesResult.error)
      return NextResponse.json({ error: 'Failed to fetch companies' }, { status: 500 })
    }

    if (usersResult.error) {
      console.error('Users query error:', usersResult.error)
      return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 })
    }

    // Merge auth user data with public user data
    const authUsersMap = new Map(
      (authUsersResult.data?.users || []).map(u => [u.id, u])
    )

    const usersWithAuth = (usersResult.data || []).map(user => ({
      ...user,
      last_sign_in_at: authUsersMap.get(user.id)?.last_sign_in_at
    }))

    console.log('[API] Fetched data:', {
      sheetsCount: sheetsResult.data?.length,
      companiesCount: companiesResult.data?.length,
      usersCount: usersResult.data?.length,
      authUsersCount: authUsersResult.data?.users?.length
    })

    return NextResponse.json({
      sheets: sheetsResult.data || [],
      companies: companiesResult.data || [],
      users: usersWithAuth,
    })
  } catch (error) {
    console.error('Association metrics API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
