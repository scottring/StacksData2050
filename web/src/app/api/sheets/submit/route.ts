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
      // Get sheet name
      const { data: sheet } = await supabase
        .from('sheets')
        .select('name')
        .eq('id', sheet_id)
        .single()

      // Send notification (non-blocking) -- notify-submitted resolves email via service role
      fetch(new URL('/api/requests/notify-submitted', request.url).toString(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sheetId: sheet_id,
          customerCompanyId: requestData.requestor_id,
          productName: sheet?.name || 'Product',
        })
      }).catch(console.error)
    }
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Submit error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
