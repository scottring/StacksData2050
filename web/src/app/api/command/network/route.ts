import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { CompanyNode, RequestArc } from '@/lib/geo'

// Default coordinates for companies without geocoding
const DEFAULT_LOCATIONS: Record<string, { lat: number; lng: number }> = {
  'Germany': { lat: 51.1657, lng: 10.4515 },
  'Finland': { lat: 61.9241, lng: 25.7482 },
  'UK': { lat: 55.3781, lng: -3.4360 },
  'United Kingdom': { lat: 55.3781, lng: -3.4360 },
  'USA': { lat: 37.0902, lng: -95.7129 },
  'United States': { lat: 37.0902, lng: -95.7129 },
  'China': { lat: 35.8617, lng: 104.1954 },
  'Japan': { lat: 36.2048, lng: 138.2529 },
  'France': { lat: 46.2276, lng: 2.2137 },
  'Italy': { lat: 41.8719, lng: 12.5674 },
  'Spain': { lat: 40.4637, lng: -3.7492 },
  'Netherlands': { lat: 52.1326, lng: 5.2913 },
  'Sweden': { lat: 60.1282, lng: 18.6435 },
  'Switzerland': { lat: 46.8182, lng: 8.2275 },
  'India': { lat: 20.5937, lng: 78.9629 },
  'Brazil': { lat: -14.2350, lng: -51.9253 },
  'South Korea': { lat: 35.9078, lng: 127.7669 },
  'Australia': { lat: -25.2744, lng: 133.7751 },
  'Canada': { lat: 56.1304, lng: -106.3468 },
}

function getCoordinates(company: Record<string, unknown>): { lat: number; lng: number } | null {
  // Try to match location_text to known countries
  const location = (company.location_text as string) || ''
  for (const [country, coords] of Object.entries(DEFAULT_LOCATIONS)) {
    if (location.toLowerCase().includes(country.toLowerCase())) {
      return coords
    }
  }

  // Scatter unknowns around Europe as a fallback with jitter
  const hash = (company.id as string || '').split('').reduce((a, b) => a + b.charCodeAt(0), 0)
  return {
    lat: 48 + (hash % 15) - 7,
    lng: 5 + (hash % 30) - 15,
  }
}

export async function GET() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Get user's company
  const { data: profile } = await supabase
    .from('users')
    .select('company_id')
    .eq('id', user.id)
    .single()

  if (!profile?.company_id) {
    return NextResponse.json({ companies: [], requests: [] })
  }

  const companyId = profile.company_id

  // Get all sheets where we are customer or supplier
  const { data: sheets } = await supabase
    .from('sheets')
    .select('id, company_id, requesting_company_id, status, name')
    .or(`company_id.eq.${companyId},requesting_company_id.eq.${companyId}`)

  if (!sheets || sheets.length === 0) {
    return NextResponse.json({ companies: [], requests: [] })
  }

  // Collect all company IDs involved
  const companyIds = new Set<string>()
  companyIds.add(companyId)
  for (const sheet of sheets) {
    if (sheet.company_id) companyIds.add(sheet.company_id)
    if (sheet.requesting_company_id) companyIds.add(sheet.requesting_company_id)
  }

  // Fetch companies
  // Note: companies has no latitude/longitude columns. Coordinates are derived
  // by getCoordinates() from location_text (or a name hash fallback).
  const { data: companiesRaw } = await supabase
    .from('companies')
    .select('id, name, location_text, show_as_supplier')
    .in('id', Array.from(companyIds))

  if (!companiesRaw) {
    return NextResponse.json({ companies: [], requests: [] })
  }

  // Build company nodes
  const companies: CompanyNode[] = companiesRaw.map((c) => {
    const coords = getCoordinates(c)
    const isCustomer = sheets.some((s) => s.requesting_company_id === c.id)
    const isSupplier = sheets.some((s) => s.company_id === c.id)
    const role = isCustomer && isSupplier ? 'both' : isCustomer ? 'customer' : 'supplier'

    // Count pending actions for this company relative to the user
    const pendingActions = sheets.filter((s) => {
      if (c.id === companyId) return false // Don't count our own actions
      const isOurSupplier = s.company_id === c.id && s.requesting_company_id === companyId
      const isOurCustomer = s.requesting_company_id === c.id && s.company_id === companyId
      return (isOurSupplier || isOurCustomer) && ['draft', 'in_progress', 'submitted'].includes(s.status || '')
    }).length

    return {
      id: c.id,
      name: c.name || 'Unknown',
      latitude: coords?.lat || 0,
      longitude: coords?.lng || 0,
      role,
      pendingActions,
    }
  })

  // Build request arcs from sheets
  const requests: RequestArc[] = sheets
    .filter((s) => s.company_id && s.requesting_company_id)
    .map((s) => {
      let status: RequestArc['status'] = 'awaiting'
      if (s.status === 'completed' || s.status === 'approved') status = 'complete'
      else if (s.status === 'submitted') status = 'processing'
      else if (s.status === 'rejected' || s.status === 'flagged') status = 'attention'

      return {
        id: s.id,
        fromCompanyId: s.requesting_company_id!,
        toCompanyId: s.company_id!,
        status,
        productName: s.name || 'Unknown Product',
        frameworks: [],
      }
    })

  return NextResponse.json({ companies, requests })
}
