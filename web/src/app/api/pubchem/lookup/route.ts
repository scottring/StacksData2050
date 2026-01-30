import { NextRequest, NextResponse } from 'next/server'

/**
 * Proxy endpoint for PubChem compound lookup by name or CAS
 * This avoids CORS issues when calling PubChem from the browser
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const name = searchParams.get('name')
  const cas = searchParams.get('cas')

  const query = name || cas
  if (!query || query.trim().length < 1) {
    return NextResponse.json(null)
  }

  try {
    const trimmed = query.trim()

    // Search by name to get CID
    const searchUrl = `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/name/${encodeURIComponent(trimmed)}/cids/JSON`
    const searchResponse = await fetch(searchUrl, {
      headers: { 'Accept': 'application/json' },
    })

    if (!searchResponse.ok) {
      return NextResponse.json(null)
    }

    const searchData = await searchResponse.json()
    const cid = searchData?.IdentifierList?.CID?.[0]

    if (!cid) {
      return NextResponse.json(null)
    }

    // Fetch compound properties and synonyms in parallel
    const [compoundResponse, synonymsResponse] = await Promise.all([
      fetch(`https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/${cid}/property/MolecularFormula,MolecularWeight,IUPACName,InChIKey/JSON`, {
        headers: { 'Accept': 'application/json' },
      }),
      fetch(`https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/${cid}/synonyms/JSON`, {
        headers: { 'Accept': 'application/json' },
      })
    ])

    if (!compoundResponse.ok) {
      return NextResponse.json(null)
    }

    const compoundData = await compoundResponse.json()
    const synonymsData = synonymsResponse.ok ? await synonymsResponse.json() : null

    const properties = compoundData?.PropertyTable?.Properties?.[0]
    const synonyms = synonymsData?.InformationList?.Information?.[0]?.Synonym || []

    // Find CAS number from synonyms (format: xxx-xx-x)
    const casNumber = synonyms.find((s: string) => /^\d{2,7}-\d{2}-\d$/.test(s)) || ''

    // Find preferred name (first non-CAS synonym)
    const preferredName = synonyms.find((s: string) => !/^\d{2,7}-\d{2}-\d$/.test(s)) || trimmed

    return NextResponse.json({
      cas: casNumber,
      name: preferredName,
      molecularFormula: properties?.MolecularFormula,
      molecularWeight: properties?.MolecularWeight,
      iupacName: properties?.IUPACName,
      synonyms: synonyms.slice(0, 10),
      inchiKey: properties?.InChIKey,
      pubchemCid: cid,
    })
  } catch (error) {
    console.error('PubChem lookup proxy error:', error)
    return NextResponse.json(null)
  }
}
