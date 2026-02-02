import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()

    if (!email) {
      return NextResponse.json({ error: 'Email required' }, { status: 400 })
    }

    const supabase = createAdminClient()

    // Check if user exists in users table (our app's user records)
    const { data: userData } = await supabase
      .from('users')
      .select('id')
      .eq('email', email.toLowerCase())
      .maybeSingle()

    // Check if user exists in Supabase Auth by listing users with filter
    // Use pagination to search through all users
    let authUserExists = false
    let page = 1
    const perPage = 1000

    while (!authUserExists) {
      const { data: usersData, error } = await supabase.auth.admin.listUsers({
        page,
        perPage,
      })

      if (error || !usersData?.users?.length) {
        break
      }

      authUserExists = usersData.users.some(
        user => user.email?.toLowerCase() === email.toLowerCase()
      )

      // If we found fewer users than perPage, we've reached the end
      if (usersData.users.length < perPage) {
        break
      }

      page++

      // Safety limit - don't search more than 10 pages (10,000 users)
      if (page > 10) {
        break
      }
    }

    return NextResponse.json({
      exists: authUserExists,
      hasProfile: !!userData,
    })
  } catch (error) {
    console.error('Check user error:', error)
    return NextResponse.json({ exists: false, hasProfile: false })
  }
}
