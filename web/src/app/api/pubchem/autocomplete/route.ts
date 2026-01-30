import { NextRequest, NextResponse } from 'next/server'

/**
 * Proxy endpoint for PubChem autocomplete API
 * This avoids CORS issues when calling PubChem from the browser
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const query = searchParams.get('q')

  if (!query || query.trim().length < 2) {
    return NextResponse.json([])
  }

  try {
    const url = `https://pubchem.ncbi.nlm.nih.gov/rest/autocomplete/compound/${encodeURIComponent(query.trim())}/json?limit=8`

    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
      },
    })

    if (!response.ok) {
      console.warn('PubChem autocomplete failed:', response.status)
      return NextResponse.json([])
    }

    const data = await response.json()
    const suggestions = data?.dictionary_terms?.compound || []

    // Return formatted suggestions
    return NextResponse.json(
      suggestions.map((name: string) => ({
        name,
        cid: 0 // Will be looked up when selected
      }))
    )
  } catch (error) {
    console.error('PubChem autocomplete proxy error:', error)
    return NextResponse.json([])
  }
}
