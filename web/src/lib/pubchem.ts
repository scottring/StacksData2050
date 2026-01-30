/**
 * PubChem API Integration for CAS Number Lookup
 *
 * Uses the free PubChem REST API to fetch chemical information
 * https://pubchem.ncbi.nlm.nih.gov/docs/pug-rest
 */

export interface ChemicalData {
  cas: string
  name: string
  molecularFormula?: string
  molecularWeight?: number
  iupacName?: string
  synonyms?: string[]
  hazards?: string[]
  inchiKey?: string
  pubchemCid?: number
}

export interface RegulatoryFlags {
  reachSVHC: boolean
  rohs: boolean
  prop65: boolean
  fdaFCN: boolean
  warnings: string[]
}

/**
 * Lookup chemical information by CAS number using PubChem API
 */
export async function lookupCAS(casNumber: string): Promise<ChemicalData | null> {
  try {
    // Clean CAS number (remove spaces, validate format)
    const cleanCAS = casNumber.trim().replace(/\s+/g, '')

    // Validate CAS format (xxx-xx-x or xxxxxx-xx-x)
    // Return null silently for invalid formats (don't throw - user may still be typing)
    if (!/^\d{2,7}-\d{2}-\d$/.test(cleanCAS)) {
      return null
    }

    // Use our API route to avoid CORS issues with PubChem
    const url = `/api/pubchem/lookup?cas=${encodeURIComponent(cleanCAS)}`
    const response = await fetch(url)

    if (!response.ok) {
      console.warn(`PubChem search failed for CAS ${cleanCAS}`)
      return null
    }

    const data = await response.json()
    if (!data) {
      return null
    }

    // Ensure we return the clean CAS that was requested
    return {
      ...data,
      cas: cleanCAS,
    }
  } catch (error) {
    console.error('Error looking up CAS number:', error)
    return null
  }
}

/**
 * Check regulatory status for a chemical
 * This is a simplified version - in production, you'd integrate with:
 * - ECHA REACH database API
 * - EPA databases
 * - FDA Food Contact Substance (FCS) database
 */
export async function checkRegulatoryStatus(
  cas: string,
  chemicalName?: string
): Promise<RegulatoryFlags> {
  // For demo purposes, we'll flag some known problematic chemicals
  // In production, this would query actual regulatory databases

  const flags: RegulatoryFlags = {
    reachSVHC: false,
    rohs: false,
    prop65: false,
    fdaFCN: false,
    warnings: [],
  }

  // Demo: Known SVHC substances (Substances of Very High Concern)
  const knownSVHC = [
    '50-00-0',  // Formaldehyde
    '7439-92-1', // Lead
    '7440-43-9', // Cadmium
    '1163-19-5', // DEHP
    '117-81-7',  // DEHP
    '85535-84-8', // SCCP (short-chain chlorinated paraffins)
  ]

  // Demo: Known RoHS restricted substances
  const knownRoHS = [
    '7439-92-1', // Lead
    '7440-43-9', // Cadmium
    '7439-97-6', // Mercury
    '7440-02-0', // Nickel (in certain forms)
  ]

  // Demo: Known Prop 65 chemicals
  const knownProp65 = [
    '50-00-0',   // Formaldehyde
    '7439-92-1', // Lead
    '71-43-2',   // Benzene
  ]

  if (knownSVHC.includes(cas)) {
    flags.reachSVHC = true
    flags.warnings.push('⚠️ Listed as REACH SVHC (Substance of Very High Concern)')
  }

  if (knownRoHS.includes(cas)) {
    flags.rohs = true
    flags.warnings.push('⚠️ Restricted under EU RoHS Directive')
  }

  if (knownProp65.includes(cas)) {
    flags.prop65 = true
    flags.warnings.push('⚠️ Listed under California Prop 65')
  }

  // Check for PFAS (per- and polyfluoroalkyl substances) by name
  if (chemicalName?.toLowerCase().includes('fluoro')) {
    flags.warnings.push('⚠️ May be a PFAS substance - verify against EU restrictions')
  }

  // Check for BPA (common in food contact)
  if (cas === '80-05-7' || chemicalName?.toLowerCase().includes('bisphenol')) {
    flags.warnings.push('⚠️ Bisphenol compound - may require migration testing for food contact')
  }

  return flags
}

/**
 * Batch lookup multiple CAS numbers
 */
export async function batchLookupCAS(casNumbers: string[]): Promise<Map<string, ChemicalData | null>> {
  const results = new Map<string, ChemicalData | null>()

  // Process in batches to avoid rate limiting
  const batchSize = 5
  for (let i = 0; i < casNumbers.length; i += batchSize) {
    const batch = casNumbers.slice(i, i + batchSize)
    const batchResults = await Promise.all(
      batch.map(cas => lookupCAS(cas))
    )

    batch.forEach((cas, index) => {
      results.set(cas, batchResults[index])
    })

    // Small delay to avoid rate limiting
    if (i + batchSize < casNumbers.length) {
      await new Promise(resolve => setTimeout(resolve, 100))
    }
  }

  return results
}

/**
 * Validate CAS number checksum
 * CAS numbers use a checksum algorithm for validation
 */
export function validateCASChecksum(cas: string): boolean {
  const cleanCAS = cas.replace(/-/g, '')
  if (!/^\d+$/.test(cleanCAS)) return false

  const digits = cleanCAS.split('').map(Number)
  const checkDigit = digits.pop()!

  let sum = 0
  digits.reverse().forEach((digit, index) => {
    sum += digit * (index + 1)
  })

  return (sum % 10) === checkDigit
}

/**
 * Autocomplete chemical names using PubChem API
 * Returns up to 10 suggestions
 */
export interface AutocompleteSuggestion {
  name: string
  cid: number
}

export async function autocompleteChemical(query: string): Promise<AutocompleteSuggestion[]> {
  try {
    const trimmed = query.trim()
    if (trimmed.length < 2) return []

    // Use our API route to avoid CORS issues with PubChem
    const url = `/api/pubchem/autocomplete?q=${encodeURIComponent(trimmed)}`
    const response = await fetch(url)

    if (!response.ok) {
      return []
    }

    const suggestions = await response.json()
    return suggestions || []
  } catch (error) {
    console.error('Autocomplete error:', error)
    return []
  }
}

/**
 * Lookup chemical by name and return full data including CAS number
 */
export async function lookupByName(chemicalName: string): Promise<ChemicalData | null> {
  try {
    const trimmed = chemicalName.trim()
    if (!trimmed) return null

    // Use our API route to avoid CORS issues with PubChem
    const url = `/api/pubchem/lookup?name=${encodeURIComponent(trimmed)}`
    const response = await fetch(url)

    if (!response.ok) {
      console.warn('Lookup API failed:', response.status)
      return null
    }

    const data = await response.json()
    return data
  } catch (error) {
    console.error('Error looking up chemical by name:', error)
    return null
  }
}
