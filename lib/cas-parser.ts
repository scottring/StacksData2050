/**
 * CAS Parser Utility
 *
 * Handles messy real-world CAS number data:
 * - Extracts CAS numbers from mixed text (e.g., "Glutaraldehyde 111-30-8")
 * - Parses concentration values with operators (e.g., "< 150", "> 5", "5-10")
 * - Validates CAS number format (XXX-XX-X or XXXXX-XX-X)
 * - Extracts units from concentration strings (e.g., "< 150 ppm")
 */

export interface ParsedConcentration {
  value: number | null
  operator: '<' | '>' | '<=' | '>=' | '~' | '-' | null  // null means exact value
  rangeMin: number | null
  rangeMax: number | null
  unit: string | null
  originalText: string
}

export interface ParsedCAS {
  casNumber: string | null
  chemicalName: string | null
  concentration: ParsedConcentration | null
  confidence: 'high' | 'medium' | 'low'
}

/**
 * Validate CAS number format
 * Valid: 111-30-8, 7732-18-5, 50-00-0
 */
export function isValidCASFormat(cas: string): boolean {
  // CAS format: 2-7 digits, hyphen, 2 digits, hyphen, 1 digit
  const casRegex = /^\d{2,7}-\d{2}-\d$/
  return casRegex.test(cas)
}

/**
 * Extract CAS number from mixed text
 * Examples:
 * - "111-30-8" → "111-30-8"
 * - "Glutaraldehyde 111-30-8" → "111-30-8"
 * - "CAS: 111-30-8" → "111-30-8"
 * - "Formaldehyde (50-00-0)" → "50-00-0"
 */
export function extractCASNumber(text: string): string | null {
  if (!text) return null

  // Remove common prefixes
  const cleaned = text
    .replace(/cas\s*:?\s*/gi, '')
    .replace(/cas#\s*/gi, '')
    .trim()

  // Pattern: 2-7 digits, hyphen, 2 digits, hyphen, 1 digit
  const casPattern = /\b(\d{2,7}-\d{2}-\d)\b/g
  const matches = cleaned.match(casPattern)

  if (!matches || matches.length === 0) return null

  // Return first valid CAS number
  for (const match of matches) {
    if (isValidCASFormat(match)) {
      return match
    }
  }

  return null
}

/**
 * Parse concentration value with operators and ranges
 * Examples:
 * - "< 150" → { value: 150, operator: '<', rangeMin: null, rangeMax: 150 }
 * - "> 5" → { value: 5, operator: '>', rangeMin: 5, rangeMax: null }
 * - "5-10" → { value: 7.5, operator: '-', rangeMin: 5, rangeMax: 10 }
 * - "~50" → { value: 50, operator: '~', rangeMin: null, rangeMax: null }
 * - "150" → { value: 150, operator: null, rangeMin: null, rangeMax: null }
 * - "< 150 ppm" → { value: 150, operator: '<', unit: 'ppm' }
 */
export function parseConcentration(text: string | null | undefined): ParsedConcentration {
  const result: ParsedConcentration = {
    value: null,
    operator: null,
    rangeMin: null,
    rangeMax: null,
    unit: null,
    originalText: text || '',
  }

  if (!text) return result

  const cleaned = text.trim()

  // Extract unit (%, ppm, mg/kg, w/w, etc.)
  const unitPattern = /\b(ppm|ppb|%|mg\/kg|g\/kg|w\/w|v\/v|percent)\b/i
  const unitMatch = cleaned.match(unitPattern)
  if (unitMatch) {
    result.unit = unitMatch[1].toLowerCase()
  }

  // Remove unit for parsing
  const withoutUnit = cleaned.replace(unitPattern, '').trim()

  // Pattern: < 150, <= 150, > 5, >= 5
  const operatorPattern = /^([<>]=?|~)\s*(\d+\.?\d*)/
  const operatorMatch = withoutUnit.match(operatorPattern)

  if (operatorMatch) {
    const operator = operatorMatch[1]
    const value = parseFloat(operatorMatch[2])

    result.value = value
    result.operator = operator as ParsedConcentration['operator']

    if (operator.startsWith('<')) {
      result.rangeMax = value
      result.rangeMin = null
    } else if (operator.startsWith('>')) {
      result.rangeMin = value
      result.rangeMax = null
    } else if (operator === '~') {
      // Approximate value
      result.rangeMin = value * 0.9
      result.rangeMax = value * 1.1
    }

    return result
  }

  // Pattern: range like "5-10", "5 - 10", "5 to 10"
  const rangePattern = /(\d+\.?\d*)\s*(?:-|to)\s*(\d+\.?\d*)/
  const rangeMatch = withoutUnit.match(rangePattern)

  if (rangeMatch) {
    const min = parseFloat(rangeMatch[1])
    const max = parseFloat(rangeMatch[2])

    result.rangeMin = min
    result.rangeMax = max
    result.value = (min + max) / 2  // Use midpoint
    result.operator = '-'

    return result
  }

  // Pattern: simple number
  const numberPattern = /^(\d+\.?\d*)$/
  const numberMatch = withoutUnit.match(numberPattern)

  if (numberMatch) {
    result.value = parseFloat(numberMatch[1])
    return result
  }

  // Couldn't parse
  return result
}

/**
 * Parse a field that might contain chemical name, CAS, and concentration
 * Example: "Glutaraldehyde 111-30-8 < 150 ppm"
 */
export function parseChemicalField(text: string): ParsedCAS {
  const result: ParsedCAS = {
    casNumber: null,
    chemicalName: null,
    concentration: null,
    confidence: 'low',
  }

  if (!text) return result

  // Extract CAS number first
  const cas = extractCASNumber(text)
  if (cas) {
    result.casNumber = cas
    result.confidence = 'high'

    // Remove CAS from text to get remaining parts
    const withoutCAS = text
      .replace(cas, '')
      .replace(/[()]/g, '')  // Remove parentheses
      .replace(/\s+/g, ' ')  // Normalize whitespace
      .trim()

    // Try to extract concentration from remaining text
    // Look for patterns like: < 150, > 5, 5-10, etc.
    const concentrationPattern = /([<>]=?|~)?\s*(\d+\.?\d*)\s*(?:-|to)?\s*(\d+\.?\d*)?\s*(ppm|ppb|%|mg\/kg|g\/kg|w\/w|v\/v|percent)?/
    const match = withoutCAS.match(concentrationPattern)

    if (match) {
      const fullMatch = match[0]
      const concentration = parseConcentration(fullMatch)

      if (concentration.value !== null) {
        result.concentration = concentration

        // Remove concentration from text to get chemical name
        const withoutConcentration = withoutCAS
          .replace(fullMatch, '')
          .replace(/\s+/g, ' ')
          .trim()

        if (withoutConcentration.length > 0) {
          result.chemicalName = withoutConcentration
        }
      }
    } else {
      // No concentration found, rest is chemical name
      if (withoutCAS.length > 0) {
        result.chemicalName = withoutCAS
      }
    }
  } else {
    // No CAS found, try to parse as just concentration
    const concentration = parseConcentration(text)
    if (concentration.value !== null) {
      result.concentration = concentration
      result.confidence = 'medium'
    } else {
      // Might be just a chemical name
      result.chemicalName = text.trim()
      result.confidence = 'low'
    }
  }

  return result
}

/**
 * Normalize concentration to a standard unit (percentage)
 * Handles: %, ppm, ppb, mg/kg, g/kg
 */
export function normalizeConcentration(
  value: number | null,
  unit: string | null
): number | null {
  if (value === null) return null
  if (!unit) return value  // Assume already normalized

  const unitLower = unit.toLowerCase()

  switch (unitLower) {
    case '%':
    case 'percent':
    case 'w/w':
    case 'v/v':
      return value

    case 'ppm':
      return value / 10000  // 1 ppm = 0.0001%

    case 'ppb':
      return value / 10000000  // 1 ppb = 0.0000001%

    case 'mg/kg':
      return value / 10000  // Same as ppm

    case 'g/kg':
      return value / 10  // 1 g/kg = 0.1%

    default:
      return value  // Unknown unit, return as-is
  }
}

/**
 * Format concentration for display
 */
export function formatConcentration(parsed: ParsedConcentration): string {
  if (parsed.value === null) return '(Not specified)'

  const unit = parsed.unit || '%'

  if (parsed.operator === '-' && parsed.rangeMin !== null && parsed.rangeMax !== null) {
    return `${parsed.rangeMin}-${parsed.rangeMax} ${unit}`
  }

  if (parsed.operator && parsed.operator !== '-') {
    return `${parsed.operator} ${parsed.value} ${unit}`
  }

  return `${parsed.value} ${unit}`
}

/**
 * Test cases for validation
 */
export const testCases = {
  casNumbers: [
    { input: '111-30-8', expected: '111-30-8' },
    { input: 'Glutaraldehyde 111-30-8', expected: '111-30-8' },
    { input: 'CAS: 111-30-8', expected: '111-30-8' },
    { input: 'Formaldehyde (50-00-0)', expected: '50-00-0' },
    { input: 'Invalid CAS 123', expected: null },
  ],
  concentrations: [
    { input: '< 150', expected: { value: 150, operator: '<' } },
    { input: '> 5', expected: { value: 5, operator: '>' } },
    { input: '5-10', expected: { value: 7.5, operator: '-', rangeMin: 5, rangeMax: 10 } },
    { input: '~50', expected: { value: 50, operator: '~' } },
    { input: '150', expected: { value: 150, operator: null } },
    { input: '< 150 ppm', expected: { value: 150, operator: '<', unit: 'ppm' } },
    { input: '5 to 10 %', expected: { value: 7.5, operator: '-', rangeMin: 5, rangeMax: 10, unit: '%' } },
  ],
  mixedFields: [
    {
      input: 'Glutaraldehyde 111-30-8 < 150',
      expected: {
        casNumber: '111-30-8',
        chemicalName: 'Glutaraldehyde',
        concentration: { value: 150, operator: '<' },
      },
    },
    {
      input: '111-30-8 < 150 ppm',
      expected: {
        casNumber: '111-30-8',
        concentration: { value: 150, operator: '<', unit: 'ppm' },
      },
    },
  ],
}
