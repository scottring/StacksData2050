import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import crypto from 'crypto'

/**
 * Generate a new API key with format: sk_live_<random32chars>
 */
function generateApiKey(): string {
  const randomBytes = crypto.randomBytes(24)
  const base64 = randomBytes.toString('base64')
    .replace(/\+/g, '')
    .replace(/\//g, '')
    .replace(/=/g, '')
  return `sk_live_${base64.substring(0, 32)}`
}

/**
 * Calculate expiration date based on expires_in parameter
 */
function calculateExpiration(expiresIn: string): string | null {
  const now = new Date()

  switch (expiresIn) {
    case '30d':
      now.setDate(now.getDate() + 30)
      return now.toISOString()
    case '90d':
      now.setDate(now.getDate() + 90)
      return now.toISOString()
    case '1y':
      now.setFullYear(now.getFullYear() + 1)
      return now.toISOString()
    case 'never':
    default:
      return null
  }
}

// POST - Create new API key
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Auth check
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's company
    const { data: userData } = await supabase
      .from('users')
      .select('company_id, role')
      .eq('id', user.id)
      .single()

    if (!userData?.company_id) {
      return NextResponse.json({ error: 'User company not found' }, { status: 403 })
    }

    // Parse request body
    const body = await request.json()
    const { name, scopes = ['sheets:read'], expires_in = 'never' } = body

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }

    if (!Array.isArray(scopes) || scopes.length === 0) {
      return NextResponse.json({ error: 'At least one scope is required' }, { status: 400 })
    }

    // Validate scopes
    const validScopes = ['sheets:read', 'sheets:export', 'companies:read', 'webhooks:manage']
    for (const scope of scopes) {
      if (!validScopes.includes(scope)) {
        return NextResponse.json({ error: `Invalid scope: ${scope}` }, { status: 400 })
      }
    }

    // Generate the API key
    const apiKey = generateApiKey()
    const keyHash = crypto.createHash('sha256').update(apiKey).digest('hex')
    const keyPrefix = apiKey.substring(0, 12)

    // Calculate expiration
    const expiresAt = calculateExpiration(expires_in)

    // Insert into database
    const { data: insertedKey, error: insertError } = await supabase
      .from('api_keys')
      .insert({
        company_id: userData.company_id,
        name: name.trim(),
        key_hash: keyHash,
        key_prefix: keyPrefix,
        scopes,
        expires_at: expiresAt,
        created_by: user.id
      })
      .select('id, name, key_prefix, scopes, created_at, expires_at')
      .single()

    if (insertError) {
      console.error('Failed to create API key:', insertError)
      return NextResponse.json({ error: 'Failed to create API key' }, { status: 500 })
    }

    // Return the key - this is the only time the full key is shown
    return NextResponse.json({
      success: true,
      id: insertedKey.id,
      key: apiKey, // Full key - only shown once
      name: insertedKey.name,
      key_prefix: insertedKey.key_prefix,
      scopes: insertedKey.scopes,
      created_at: insertedKey.created_at,
      expires_at: insertedKey.expires_at
    })
  } catch (error) {
    console.error('API key creation error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// GET - List API keys for user's company
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Auth check
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's company
    const { data: userData } = await supabase
      .from('users')
      .select('company_id')
      .eq('id', user.id)
      .single()

    if (!userData?.company_id) {
      return NextResponse.json({ error: 'User company not found' }, { status: 403 })
    }

    // Fetch API keys
    const { data: keys, error } = await supabase
      .from('api_keys')
      .select('id, name, key_prefix, scopes, is_active, last_used_at, created_at, expires_at')
      .eq('company_id', userData.company_id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Failed to fetch API keys:', error)
      return NextResponse.json({ error: 'Failed to fetch API keys' }, { status: 500 })
    }

    return NextResponse.json({ keys })
  } catch (error) {
    console.error('API keys fetch error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE - Revoke an API key
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Auth check
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get key ID from URL
    const { searchParams } = new URL(request.url)
    const keyId = searchParams.get('id')

    if (!keyId) {
      return NextResponse.json({ error: 'Key ID is required' }, { status: 400 })
    }

    // Get user's company
    const { data: userData } = await supabase
      .from('users')
      .select('company_id')
      .eq('id', user.id)
      .single()

    if (!userData?.company_id) {
      return NextResponse.json({ error: 'User company not found' }, { status: 403 })
    }

    // Revoke the key (soft delete)
    const { error } = await supabase
      .from('api_keys')
      .update({
        is_active: false,
        revoked_at: new Date().toISOString(),
        revoked_by: user.id
      })
      .eq('id', keyId)
      .eq('company_id', userData.company_id)

    if (error) {
      console.error('Failed to revoke API key:', error)
      return NextResponse.json({ error: 'Failed to revoke API key' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('API key revocation error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
