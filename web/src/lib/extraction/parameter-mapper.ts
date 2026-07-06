/**
 * Parameter Mapper
 *
 * Maps extraction_items (from uploaded documents) to questions
 * (filtered by sheet tags) to produce mapped parameters with
 * confidence scores.
 *
 * This is the core AI innovation bridging document extraction
 * to the traditional Q&A model.
 */

// ─── Types ─────────────────────────────────────────────────

export interface ExtractionItem {
  id: string
  document_id: string
  item_type: 'chemical' | 'hazard' | 'test_result' | 'physical_property' | 'traceability'
  data: Record<string, unknown>
  confidence: number
}

export interface Question {
  id: string
  content: string | null
  question_type: string | null
  section_name_sort: string | null
  subsection_name_sort: string | null
  section_sort_number: number | null
  subsection_sort_number: number | null
  order_number: number | null
  required: boolean | null
  optional_question: boolean | null
  clarification: string | null
}

export interface ExistingAnswer {
  id: string
  question_id: string | null
  text_value: string | null
  number_value: number | null
  boolean_value: boolean | null
  text_area_value: string | null
  choice_id: string | null
  date_value: string | null
  file_url: string | null
}

export interface MappedParameter {
  questionId: string
  questionContent: string
  questionType: string
  sectionName: string
  subsectionName: string
  sectionNumber: number
  subsectionNumber: number
  orderNumber: number
  required: boolean

  // Mapping result
  status: 'mapped' | 'existing' | 'gap'
  extractedValue: string | null
  extractionItemId: string | null
  extractionItemType: string | null
  sourceDocumentId: string | null
  confidence: number
  matchReason: string | null

  // Existing answer (if any)
  existingAnswerId: string | null
  existingValue: string | null
}

export interface MappingResult {
  parameters: MappedParameter[]
  summary: {
    total: number
    mapped: number
    existing: number
    gaps: number
    requiredGaps: number
    overallConfidence: number
  }
}

// ─── Keyword matching rules ────────────────────────────────

interface MatchRule {
  /** Keywords to look for in question content (lowercase) */
  keywords: string[]
  /** Extraction item type to match against */
  itemType: ExtractionItem['item_type']
  /** Field path within extraction item data */
  dataField: string
  /** Base confidence bonus for this match type */
  confidenceBonus: number
}

const MATCH_RULES: MatchRule[] = [
  // Chemical / CAS matches
  // NOTE: bare 'cas' dropped -- collides with "CAS 64-17-5" embedded in yes/no
  // questions ("Is ethanol (CAS 64-17-5) intentionally added...") that are not
  // asking for a CAS number value.
  { keywords: ['cas number', 'cas no', 'cas#', 'cas registry'], itemType: 'chemical', dataField: 'cas_number', confidenceBonus: 0.95 },
  // NOTE: bare 'ingredient' dropped -- matches "dairy based ingredients" in a
  // yes/no allergen question, not a request for a chemical name.
  { keywords: ['chemical name', 'substance name'], itemType: 'chemical', dataField: 'chemical_name', confidenceBonus: 0.9 },
  // NOTE: bare 'concentration' dropped entirely. HQ2.1 has ~32 questions containing
  // "concentration" and every one of them is a regulatory gate ("does the product
  // contain <SVHC/PFAS/POP/etc.> in concentrations exceeding 0.1%?") or a follow-up
  // asking for the concentration of THAT SPECIFIC flagged substance, not any
  // generic chemical's concentration. A generic chemical.concentration_max_pct
  // value is not a safe answer to any of them.
  { keywords: ['weight %', 'wt%', 'weight percent'], itemType: 'chemical', dataField: 'concentration_max_pct', confidenceBonus: 0.85 },
  // NOTE: bare 'function' dropped. It matches HQ2.1's "Function in Application"
  // (a product-level question, e.g. "sizing agent"), but findBestMatch has no
  // way to pick the PRIMARY chemical among several extracted from one SDS --
  // it returns whichever chemical item wins on raw confidence, which in real
  // multi-substance SDS documents is frequently a trace impurity or preservative,
  // not the product's actual function. Verified against every calibration SDS
  // with >1 chemical item: wrong chemical picked in the majority of cases
  // (e.g. a "SIZING AGENT" product mapped to "Hazardous Air Pollutant (HAP)
  // impurity/component"). Kept as an honest gap; narrower multi-word phrases
  // are retained for exact per-substance asks, which don't occur in HQ2.1.
  { keywords: ['role in product', 'function in product'], itemType: 'chemical', dataField: 'function_in_product', confidenceBonus: 0.8 },

  // Hazard matches
  // NOTE: bare 'classification' dropped -- matches an unrelated Swiss food-contact
  // ink regulation's column classification ("classification (A or B) from column 6"),
  // not GHS classification.
  { keywords: ['ghs', 'ghs classification', 'hazard class'], itemType: 'hazard', dataField: 'ghs_classification', confidenceBonus: 0.9 },
  { keywords: ['signal word'], itemType: 'hazard', dataField: 'signal_word', confidenceBonus: 0.95 },
  { keywords: ['hazard statement', 'h-statement', 'h statement'], itemType: 'hazard', dataField: 'hazard_statements', confidenceBonus: 0.9 },
  { keywords: ['precautionary', 'p-statement', 'p statement'], itemType: 'hazard', dataField: 'precautionary_statements', confidenceBonus: 0.9 },

  // Physical property matches
  { keywords: ['appearance', 'visual'], itemType: 'physical_property', dataField: 'appearance', confidenceBonus: 0.85 },
  { keywords: ['odor', 'smell', 'odour'], itemType: 'physical_property', dataField: 'odor', confidenceBonus: 0.85 },
  // NOTE: bare 'ph' dropped -- substring of "graphic", "paragraph",
  // "Encephalopathy/Encephalopathies", none of which are pH questions.
  { keywords: ['acidity', 'alkalinity', 'ph value', 'ph level'], itemType: 'physical_property', dataField: 'ph', confidenceBonus: 0.9 },
  { keywords: ['boiling point'], itemType: 'physical_property', dataField: 'boiling_point', confidenceBonus: 0.9 },
  { keywords: ['flash point'], itemType: 'physical_property', dataField: 'flash_point', confidenceBonus: 0.9 },
  { keywords: ['density', 'specific gravity'], itemType: 'physical_property', dataField: 'density', confidenceBonus: 0.9 },
  { keywords: ['viscosity'], itemType: 'physical_property', dataField: 'viscosity', confidenceBonus: 0.9 },
  { keywords: ['solubility', 'soluble'], itemType: 'physical_property', dataField: 'solubility', confidenceBonus: 0.85 },

  // Test result matches
  { keywords: ['test result', 'test value', 'migration', 'sml', 'specific migration'], itemType: 'test_result', dataField: 'result_value', confidenceBonus: 0.8 },

  // Traceability matches
  // NOTE: bare 'batch' dropped -- substring of "Masterbatches" in a question
  // about base-polymer supplier listings, not a batch number. Bare 'lot' dropped
  // for the same substring-collision risk (e.g. "allotment").
  { keywords: ['batch number', 'lot number'], itemType: 'traceability', dataField: 'batch_number', confidenceBonus: 0.9 },
  { keywords: ['manufacturing date', 'production date', 'date of manufacture'], itemType: 'traceability', dataField: 'manufacturing_date', confidenceBonus: 0.9 },
  // NOTE: bare 'expiration' dropped -- matches "specify an expiration date" for a
  // Kosher/Halal certificate, not a chemical's shelf life/expiry.
  { keywords: ['shelf life', 'expiry date'], itemType: 'traceability', dataField: 'expiry_date', confidenceBonus: 0.9 },
  // NOTE: bare 'plant' and bare 'production site' dropped. 'plant' matches
  // "derived from plant (wheat, grape...) source" (botanical origin, not a
  // manufacturing site). 'production site' (singular) matches "its production
  // site or line have a Kosher/Halal certification" -- replaced with the plural
  // 'production sites' which only matches the genuine "Production sites" question.
  // Bare 'factory' dropped as an unnecessary collision risk with no observed use.
  { keywords: ['manufacturing site', 'production sites'], itemType: 'traceability', dataField: 'manufacturing_site', confidenceBonus: 0.85 },
  // NOTE: bare 'origin' dropped -- matches "substances of animal origin", a yes/no
  // allergen question, not a request for country of origin.
  { keywords: ['country of origin'], itemType: 'traceability', dataField: 'country_of_origin', confidenceBonus: 0.85 },
]

// Section-name-based context matching (fallback when keyword match isn't specific)
// NOTE: 'chemical' key dropped. The fallback loop matches any field whose name
// (with underscores replaced by spaces) contains the question's first word. For
// "Product Description or Chemical Characterization" the first word "product" is
// a substring of the field name "function_in_product", so this context key
// produced a false match (function_in_product value answering a product
// description question). 'ingredient'/'substance'/'composition' keys are kept
// since no HQ2.1 question both starts with "product" and contains those words.
const SECTION_CONTEXT: Record<string, ExtractionItem['item_type'][]> = {
  'composition': ['chemical'],
  'ingredient': ['chemical'],
  'substance': ['chemical'],
  'hazard': ['hazard'],
  'ghs': ['hazard'],
  'physical': ['physical_property'],
  'chemical properties': ['physical_property'],
  'toxicolog': ['test_result', 'hazard'],
  'ecotox': ['test_result'],
  'migration': ['test_result'],
  'test': ['test_result'],
  'regulatory': ['test_result', 'chemical'],
  'food contact': ['test_result', 'chemical'],
  'reach': ['chemical', 'test_result'],
  'tsca': ['chemical'],
  'traceability': ['traceability'],
  'batch': ['traceability'],
  'production': ['traceability'],
  'identification': ['chemical', 'traceability'],
}

// ─── Core mapper ───────────────────────────────────────────

function getNestedValue(data: Record<string, unknown>, field: string): unknown {
  return data[field]
}

function formatValue(value: unknown): string | null {
  if (value === null || value === undefined) return null
  if (Array.isArray(value)) return value.join(', ')
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

function getExistingAnswerValue(answer: ExistingAnswer): string | null {
  if (answer.text_value) return answer.text_value
  if (answer.number_value !== null) return String(answer.number_value)
  if (answer.boolean_value !== null) return answer.boolean_value ? 'Yes' : 'No'
  if (answer.text_area_value) return answer.text_area_value
  if (answer.date_value) return answer.date_value
  if (answer.file_url) return answer.file_url
  if (answer.choice_id) return `[choice:${answer.choice_id}]`
  return null
}

interface MatchCandidate {
  item: ExtractionItem
  field: string
  value: string
  confidence: number
  reason: string
}

function findBestMatch(
  question: Question,
  items: ExtractionItem[],
): MatchCandidate | null {
  const content = (question.content || '').toLowerCase()
  const sectionName = (question.section_name_sort || '').toLowerCase()
  const subsectionName = (question.subsection_name_sort || '').toLowerCase()

  const candidates: MatchCandidate[] = []

  // 1. Try keyword-based matching
  for (const rule of MATCH_RULES) {
    const matchedKeyword = rule.keywords.find((kw) => content.includes(kw))
    if (!matchedKeyword) continue

    // Find extraction items of the matching type
    const matchingItems = items.filter((item) => item.item_type === rule.itemType)

    for (const item of matchingItems) {
      const rawValue = getNestedValue(item.data, rule.dataField)
      const value = formatValue(rawValue)
      if (!value) continue

      const confidence = Math.min(rule.confidenceBonus * item.confidence, 1.0)
      candidates.push({
        item,
        field: rule.dataField,
        value,
        confidence,
        reason: `Keyword "${matchedKeyword}" → ${rule.itemType}.${rule.dataField}`,
      })
    }
  }

  // 2. Section-context fallback (lower confidence)
  if (candidates.length === 0) {
    const contextKey = Object.keys(SECTION_CONTEXT).find(
      (key) => sectionName.includes(key) || subsectionName.includes(key) || content.includes(key),
    )

    if (contextKey) {
      const relevantTypes = SECTION_CONTEXT[contextKey]
      const matchingItems = items.filter((item) => relevantTypes.includes(item.item_type))

      for (const item of matchingItems) {
        // Try to find a data field that seems relevant to the question
        for (const [field, rawValue] of Object.entries(item.data)) {
          const value = formatValue(rawValue)
          if (!value || field === 'confidence') continue

          // Check if the field name or value seems related to the question
          const fieldLower = field.toLowerCase().replace(/_/g, ' ')
          if (content.includes(fieldLower) || fieldLower.includes(content.split(' ')[0])) {
            candidates.push({
              item,
              field,
              value,
              confidence: Math.min(0.6 * item.confidence, 1.0),
              reason: `Section context "${contextKey}" + field match "${field}"`,
            })
          }
        }
      }
    }
  }

  if (candidates.length === 0) return null

  // Return highest confidence candidate
  candidates.sort((a, b) => b.confidence - a.confidence)
  return candidates[0]
}

// ─── Public API ────────────────────────────────────────────

export function mapParameters(
  questions: Question[],
  extractionItems: ExtractionItem[],
  existingAnswers: ExistingAnswer[],
): MappingResult {
  // Build answer lookup: question_id → answer
  const answerMap = new Map<string, ExistingAnswer>()
  for (const answer of existingAnswers) {
    if (answer.question_id) {
      answerMap.set(answer.question_id, answer)
    }
  }

  // Map by item type for efficient lookup
  const itemsByType = new Map<string, ExtractionItem[]>()
  for (const item of extractionItems) {
    const list = itemsByType.get(item.item_type) || []
    list.push(item)
    itemsByType.set(item.item_type, list)
  }

  const parameters: MappedParameter[] = []
  let mappedCount = 0
  let existingCount = 0
  let gapCount = 0
  let requiredGapCount = 0
  let totalConfidence = 0

  for (const question of questions) {
    const existingAnswer = answerMap.get(question.id)
    const existingValue = existingAnswer ? getExistingAnswerValue(existingAnswer) : null

    const param: MappedParameter = {
      questionId: question.id,
      questionContent: question.content || '(no content)',
      questionType: question.question_type || 'short_text',
      sectionName: question.section_name_sort || 'Unknown Section',
      subsectionName: question.subsection_name_sort || 'Unknown Subsection',
      sectionNumber: question.section_sort_number || 0,
      subsectionNumber: question.subsection_sort_number || 0,
      orderNumber: question.order_number || 0,
      required: question.required === true && question.optional_question !== true,
      status: 'gap',
      extractedValue: null,
      extractionItemId: null,
      extractionItemType: null,
      sourceDocumentId: null,
      confidence: 0,
      matchReason: null,
      existingAnswerId: existingAnswer?.id || null,
      existingValue,
    }

    // If there's already a manual answer, mark as existing
    if (existingValue) {
      param.status = 'existing'
      param.confidence = 1.0
      existingCount++
      totalConfidence += 1.0
    } else {
      // Try to find an extraction match
      const match = findBestMatch(question, extractionItems)
      if (match) {
        param.status = 'mapped'
        param.extractedValue = match.value
        param.extractionItemId = match.item.id
        param.extractionItemType = match.item.item_type
        param.sourceDocumentId = match.item.document_id
        param.confidence = match.confidence
        param.matchReason = match.reason
        mappedCount++
        totalConfidence += match.confidence
      } else {
        param.status = 'gap'
        gapCount++
        if (param.required) requiredGapCount++
      }
    }

    parameters.push(param)
  }

  // Sort by section → subsection → order
  parameters.sort((a, b) => {
    if (a.sectionNumber !== b.sectionNumber) return a.sectionNumber - b.sectionNumber
    if (a.subsectionNumber !== b.subsectionNumber) return a.subsectionNumber - b.subsectionNumber
    return a.orderNumber - b.orderNumber
  })

  const total = parameters.length
  const overallConfidence = total > 0 ? totalConfidence / total : 0

  return {
    parameters,
    summary: {
      total,
      mapped: mappedCount,
      existing: existingCount,
      gaps: gapCount,
      requiredGaps: requiredGapCount,
      overallConfidence: Math.round(overallConfidence * 100) / 100,
    },
  }
}
