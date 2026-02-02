import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function PATCH(request: Request) {
  try {
    const body = await request.json()
    const {
      email,
      platform_experience,
      biggest_surprise,
      remaining_questions,
      likelihood_to_recommend,
    } = body

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    if (!likelihood_to_recommend || likelihood_to_recommend < 1 || likelihood_to_recommend > 10) {
      return NextResponse.json({ error: 'Please provide a rating between 1 and 10' }, { status: 400 })
    }

    const supabase = createAdminClient()

    // Find the discovery response for this email
    const { data: existingResponse, error: findError } = await supabase
      .from('trial_discovery_responses')
      .select('id')
      .eq('email', email.toLowerCase())
      .single()

    if (findError || !existingResponse) {
      return NextResponse.json({ error: 'No discovery response found for this email' }, { status: 404 })
    }

    // Update with follow-up responses
    const { error: updateError } = await supabase
      .from('trial_discovery_responses')
      .update({
        platform_experience,
        biggest_surprise,
        remaining_questions,
        likelihood_to_recommend,
        follow_up_responded_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', existingResponse.id)

    if (updateError) {
      console.error('Error updating follow-up response:', updateError)
      return NextResponse.json({ error: 'Failed to save response' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'Follow-up response saved successfully',
    })
  } catch (error: any) {
    console.error('Follow-up submission error:', error)
    return NextResponse.json({
      error: 'Something went wrong. Please try again.',
      details: error.message,
    }, { status: 500 })
  }
}
