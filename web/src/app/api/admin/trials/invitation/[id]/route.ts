import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    if (!id) {
      return NextResponse.json({ error: 'Invitation ID is required' }, { status: 400 })
    }

    // Verify super admin access
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'super_admin') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    const adminClient = createAdminClient()

    // First, delete any related discovery responses (foreign key constraint)
    await adminClient
      .from('trial_discovery_responses')
      .delete()
      .eq('invitation_id', id)

    // Delete the invitation
    const { error: deleteError } = await adminClient
      .from('invitations')
      .delete()
      .eq('id', id)
      .eq('invitation_type', 'trial') // Safety: only delete trial invitations

    if (deleteError) {
      console.error('Error deleting invitation:', deleteError)
      return NextResponse.json({ error: deleteError.message || 'Failed to delete invitation' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error in delete invitation API:', error)
    return NextResponse.json({
      error: 'Failed to delete invitation',
      details: error.message,
    }, { status: 500 })
  }
}
