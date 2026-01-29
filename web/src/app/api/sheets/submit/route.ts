import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const { sheet_id } = await request.json()
    
    if (!sheet_id) {
      return NextResponse.json({ error: 'sheet_id required' }, { status: 400 })
    }
    
    const supabase = await createClient()
    
    // Update sheet status to submitted
    const { error: updateError } = await supabase
      .from('sheets')
      .update({ 
        status: 'submitted',
        modified_at: new Date().toISOString()
      })
      .eq('id', sheet_id)
    
    if (updateError) {
      console.error('Error updating sheet status:', updateError)
      return NextResponse.json({ error: 'Failed to update status' }, { status: 500 })
    }
    
    // Get request info for notification
    const { data: requestData } = await supabase
      .from('requests')
      .select('id, requestor_id')
      .eq('sheet_id', sheet_id)
      .single()
    
    if (requestData) {
      // Get customer's user for notification
      const { data: customerUsers } = await supabase
        .from('users')
        .select('email, full_name')
        .eq('company_id', requestData.requestor_id)
        .limit(1)
      
      // Get sheet name
      const { data: sheet } = await supabase
        .from('sheets')
        .select('name')
        .eq('id', sheet_id)
        .single()
      
      if (customerUsers && customerUsers.length > 0) {
        // Send notification (non-blocking)
        fetch(new URL('/api/requests/notify-submitted', request.url).toString(), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sheetId: sheet_id,
            customerEmail: customerUsers[0].email,
            customerName: customerUsers[0].full_name,
            productName: sheet?.name || 'Product',
          })
        }).catch(console.error)
      }
    }
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Submit error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
