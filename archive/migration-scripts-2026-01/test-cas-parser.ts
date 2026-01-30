import {
  extractCASNumber,
  parseConcentration,
  parseChemicalField,
  normalizeConcentration,
  formatConcentration,
  isValidCASFormat,
} from './lib/cas-parser.js'

console.log('=== Testing CAS Parser ===\n')

// Test 1: CAS Number Extraction
console.log('Test 1: CAS Number Extraction\n')

const casTests = [
  '111-30-8',
  'Glutaraldehyde 111-30-8',
  'CAS: 2682-20-4',
  'MIT (2682-20-4)',
  'BIT 2634-33-5',
  'Invalid 123',
  '203-856-5', // EC number, not CAS
]

casTests.forEach(test => {
  const result = extractCASNumber(test)
  const valid = result ? isValidCASFormat(result) : false
  console.log(`  "${test}"`)
  console.log(`    → ${result || '(none)'} ${valid ? '✓' : '✗'}`)
})

// Test 2: Concentration Parsing
console.log('\nTest 2: Concentration Parsing\n')

const concentrationTests = [
  '< 150',
  '> 5',
  '<= 10',
  '>= 2',
  '5-10',
  '5 to 10',
  '~50',
  '150',
  '< 150 ppm',
  '5-10 %',
  '< 5 w/w',
  '100',
  '-', // Empty or dash
]

concentrationTests.forEach(test => {
  const result = parseConcentration(test)
  const formatted = formatConcentration(result)
  console.log(`  "${test}"`)
  console.log(`    → ${formatted}`)
  if (result.operator) {
    console.log(`    operator: ${result.operator}, value: ${result.value}`)
  }
  if (result.rangeMin !== null || result.rangeMax !== null) {
    console.log(`    range: ${result.rangeMin} - ${result.rangeMax}`)
  }
})

// Test 3: Mixed Field Parsing
console.log('\nTest 3: Mixed Field Parsing (Real-World Examples)\n')

const mixedTests = [
  'Glutaraldehyde 111-30-8 < 150',
  'MIT 2682-20-4 < 5',
  'BIT 2634-33-5 < 10',
  '111-30-8 < 150 ppm',
  'Formaldehyde (50-00-0) 5-10%',
  'Just a chemical name',
  '< 150',
  '111-30-8',
]

mixedTests.forEach(test => {
  const result = parseChemicalField(test)
  console.log(`  "${test}"`)
  console.log(`    CAS: ${result.casNumber || '(none)'}`)
  console.log(`    Name: ${result.chemicalName || '(none)'}`)
  if (result.concentration) {
    console.log(`    Concentration: ${formatConcentration(result.concentration)}`)
  }
  console.log(`    Confidence: ${result.confidence}`)
})

// Test 4: Concentration Normalization
console.log('\nTest 4: Concentration Normalization to %\n')

const normalizationTests = [
  { value: 5, unit: '%', expected: 5 },
  { value: 1000, unit: 'ppm', expected: 0.1 },
  { value: 1000000, unit: 'ppb', expected: 0.1 },
  { value: 1000, unit: 'mg/kg', expected: 0.1 },
  { value: 50, unit: 'g/kg', expected: 5 },
]

normalizationTests.forEach(test => {
  const result = normalizeConcentration(test.value, test.unit)
  const match = Math.abs((result || 0) - test.expected) < 0.01
  console.log(`  ${test.value} ${test.unit} → ${result}% ${match ? '✓' : '✗'}`)
})

// Test 5: Real Data from Screenshot
console.log('\nTest 5: Real Data from Screenshot\n')

const realData = [
  {
    chemical: 'Glutaraldehyde',
    cas: '111-30-8',
    concentration: '< 150',
    unit: '-',
  },
  {
    chemical: 'MIT',
    cas: '2682-20-4',
    concentration: '< 5',
    unit: '-',
  },
  {
    chemical: 'BIT',
    cas: '2634-33-5',
    concentration: '< 10',
    unit: '-',
  },
]

realData.forEach(data => {
  console.log(`  ${data.chemical} (${data.cas})`)

  // Test if CAS is valid
  const validCAS = isValidCASFormat(data.cas)
  console.log(`    CAS valid: ${validCAS ? '✓' : '✗'}`)

  // Test concentration parsing
  const parsed = parseConcentration(data.concentration)
  console.log(`    Concentration: ${formatConcentration(parsed)}`)
  console.log(`    Parsed value: ${parsed.value}, operator: ${parsed.operator}`)
})

console.log('\n✅ Parser tests complete!')
