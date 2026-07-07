/**
 * Reverse Matcher
 *
 * Takes extracted question_requirements from an external questionnaire
 * and matches them against the supplier's existing internal data:
 * 1. Prior answers from other sheets
 * 2. Extraction items from uploaded documents
 * 3. Stacks internal question taxonomy (for semantic matching)
 *
 * This is the "reverse" of parameter-mapper.ts:
 * - parameter-mapper: extraction items → Stacks questions
 * - reverse-matcher: external questions → existing answers/data
 */

// ─── Types ─────────────────────────────────────────────────

export interface ExtractedQuestion {
  id: string // extraction_item.id
  question_number: string | null
  section_name: string | null
  question_text: string
  expected_type: string
  domain: string
  required: boolean
  choices: string[] | null
  regulation_reference: string | null
  confidence: number
}

export interface InternalAnswer {
  answerId: string
  questionId: string
  questionContent: string
  sectionName: string
  subsectionName: string
  value: string
  sheetId: string
  sheetName: string
}

export interface ExtractionDataItem {
  id: string
  item_type: string
  data: Record<string, unknown>
  confidence: number
  documentFileName: string
}

export interface MatchedExternalQuestion {
  extractedQuestionId: string
  questionNumber: string | null
  sectionName: string | null
  questionText: string
  expectedType: string
  domain: string
  required: boolean

  // Match result
  status: 'answered' | 'partial' | 'unmatched'
  matchedValue: string | null
  matchSource: 'prior_answer' | 'extraction' | 'document' | null
  matchSourceDetail: string | null // e.g., "Sheet: HQ 2.1 - Product X" or "SDS: product.pdf"
  confidence: number
  matchReason: string | null

  // Internal reference
  internalQuestionId: string | null
  internalAnswerId: string | null
  extractionItemId: string | null
}

export interface ReverseMatchResult {
  questions: MatchedExternalQuestion[]
  summary: {
    total: number
    answered: number
    partial: number
    unmatched: number
    requiredUnmatched: number
    overallConfidence: number
  }
  metadata: {
    documentTitle: string | null
    requestingOrganization: string | null
    referencedRegulations: string[]
  }
}

// ─── Domain-to-extraction-type mapping ─────────────────────

const DOMAIN_TO_ITEM_TYPES: Record<string, string[]> = {
  composition: ['chemical'],
  hazards: ['hazard'],
  physical_properties: ['physical_property'],
  testing: ['test_result'],
  traceability: ['traceability'],
  regulatory: ['chemical', 'test_result', 'hazard'],
  general: ['chemical', 'physical_property', 'traceability'],
}

// ─── Keyword matching for extraction data ──────────────────

interface DataFieldMatch {
  keywords: string[]
  itemType: string
  field: string
}

const DATA_FIELD_MATCHES: DataFieldMatch[] = [
  { keywords: ['cas', 'cas number', 'cas no', 'registry'], itemType: 'chemical', field: 'cas_number' },
  { keywords: ['chemical name', 'substance name', 'ingredient name'], itemType: 'chemical', field: 'chemical_name' },
  { keywords: ['concentration', 'weight %', 'wt%', 'percent'], itemType: 'chemical', field: 'concentration_max_pct' },
  { keywords: ['function', 'role', 'purpose'], itemType: 'chemical', field: 'function_in_product' },
  { keywords: ['signal word'], itemType: 'hazard', field: 'signal_word' },
  { keywords: ['ghs', 'hazard class', 'classification'], itemType: 'hazard', field: 'ghs_classification' },
  { keywords: ['hazard statement', 'h-statement'], itemType: 'hazard', field: 'hazard_statements' },
  { keywords: ['precautionary', 'p-statement'], itemType: 'hazard', field: 'precautionary_statements' },
  { keywords: ['appearance'], itemType: 'physical_property', field: 'appearance' },
  { keywords: ['odor', 'smell'], itemType: 'physical_property', field: 'odor' },
  { keywords: ['ph', 'acidity'], itemType: 'physical_property', field: 'ph' },
  { keywords: ['boiling point'], itemType: 'physical_property', field: 'boiling_point' },
  { keywords: ['flash point'], itemType: 'physical_property', field: 'flash_point' },
  { keywords: ['density', 'specific gravity'], itemType: 'physical_property', field: 'density' },
  { keywords: ['viscosity'], itemType: 'physical_property', field: 'viscosity' },
  { keywords: ['solubility', 'soluble'], itemType: 'physical_property', field: 'solubility' },
  { keywords: ['batch', 'lot number', 'lot'], itemType: 'traceability', field: 'batch_number' },
  { keywords: ['manufacturing date', 'production date'], itemType: 'traceability', field: 'manufacturing_date' },
  { keywords: ['expiry', 'expiration', 'shelf life'], itemType: 'traceability', field: 'expiry_date' },
  { keywords: ['manufacturing site', 'production site', 'plant', 'factory'], itemType: 'traceability', field: 'manufacturing_site' },
  { keywords: ['country of origin', 'origin'], itemType: 'traceability', field: 'country_of_origin' },
  { keywords: ['test', 'result', 'migration', 'sml'], itemType: 'test_result', field: 'result_value' },
  { keywords: ['product name', 'trade name'], itemType: 'chemical', field: 'chemical_name' },
]

// ─── Helpers ───────────────────────────────────────────────

function formatValue(value: unknown): string | null {
  if (value === null || value === undefined) return null
  if (Array.isArray(value)) return value.join(', ')
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

function textSimilarity(a: string, b: string): number {
  const wordsA = new Set(a.toLowerCase().split(/\s+/).filter((w) => w.length > 2))
  const wordsB = new Set(b.toLowerCase().split(/\s+/).filter((w) => w.length > 2))
  if (wordsA.size === 0 || wordsB.size === 0) return 0
  let overlap = 0
  for (const w of wordsA) {
    if (wordsB.has(w)) overlap++
  }
  return overlap / Math.max(wordsA.size, wordsB.size)
}

// ─── Core matching ─────────────────────────────────────────

function matchFromPriorAnswers(
  extQ: ExtractedQuestion,
  answers: InternalAnswer[],
): { value: string; answerId: string; questionId: string; detail: string; confidence: number; reason: string } | null {
  const qText = extQ.question_text.toLowerCase()

  // Try direct text similarity against internal question content
  let bestMatch: InternalAnswer | null = null
  let bestScore = 0

  for (const ans of answers) {
    const sim = textSimilarity(qText, ans.questionContent)
    if (sim > bestScore && sim > 0.3) {
      bestScore = sim
      bestMatch = ans
    }
  }

  if (bestMatch && bestScore > 0.3) {
    return {
      value: bestMatch.value,
      answerId: bestMatch.answerId,
      questionId: bestMatch.questionId,
      detail: `Sheet: ${bestMatch.sheetName}`,
      confidence: Math.min(bestScore * 1.2, 0.95), // Scale up slightly, cap at 0.95
      reason: `Text similarity ${Math.round(bestScore * 100)}% with "${bestMatch.questionContent.slice(0, 60)}..."`,
    }
  }

  return null
}

function matchFromExtractionData(
  extQ: ExtractedQuestion,
  items: ExtractionDataItem[],
): { value: string; itemId: string; detail: string; confidence: number; reason: string } | null {
  const qText = extQ.question_text.toLowerCase()

  // 1. Try keyword-based field matching
  for (const match of DATA_FIELD_MATCHES) {
    const keyword = match.keywords.find((kw) => qText.includes(kw))
    if (!keyword) continue

    const relevantItems = items.filter((item) => item.item_type === match.itemType)
    for (const item of relevantItems) {
      const value = formatValue(item.data[match.field])
      if (!value) continue
      return {
        value,
        itemId: item.id,
        detail: `Doc: ${item.documentFileName}`,
        confidence: Math.min(0.85 * item.confidence, 0.95),
        reason: `Keyword "${keyword}" → ${match.itemType}.${match.field}`,
      }
    }
  }

  // 2. Try domain-based matching
  const relevantTypes = DOMAIN_TO_ITEM_TYPES[extQ.domain] || []
  const domainItems = items.filter((item) => relevantTypes.includes(item.item_type))

  for (const item of domainItems) {
    for (const [field, rawValue] of Object.entries(item.data)) {
      if (field === 'confidence') continue
      const value = formatValue(rawValue)
      if (!value) continue
      const fieldWords = field.toLowerCase().replace(/_/g, ' ')
      if (qText.includes(fieldWords)) {
        return {
          value,
          itemId: item.id,
          detail: `Doc: ${item.documentFileName}`,
          confidence: Math.min(0.65 * item.confidence, 0.85),
          reason: `Domain "${extQ.domain}" + field "${field}"`,
        }
      }
    }
  }

  return null
}

// ─── Public API ────────────────────────────────────────────

export function reverseMatch(
  extractedQuestions: ExtractedQuestion[],
  priorAnswers: InternalAnswer[],
  extractionItems: ExtractionDataItem[],
  metadata?: { documentTitle?: string; requestingOrganization?: string; referencedRegulations?: string[] },
): ReverseMatchResult {
  const results: MatchedExternalQuestion[] = []
  let answeredCount = 0
  let partialCount = 0
  let unmatchedCount = 0
  let requiredUnmatchedCount = 0
  let totalConfidence = 0

  for (const extQ of extractedQuestions) {
    const result: MatchedExternalQuestion = {
      extractedQuestionId: extQ.id,
      questionNumber: extQ.question_number,
      sectionName: extQ.section_name,
      questionText: extQ.question_text,
      expectedType: extQ.expected_type,
      domain: extQ.domain,
      required: extQ.required,
      status: 'unmatched',
      matchedValue: null,
      matchSource: null,
      matchSourceDetail: null,
      confidence: 0,
      matchReason: null,
      internalQuestionId: null,
      internalAnswerId: null,
      extractionItemId: null,
    }

    // Try prior answers first (highest quality — human-verified)
    const answerMatch = matchFromPriorAnswers(extQ, priorAnswers)
    if (answerMatch && answerMatch.confidence >= 0.4) {
      result.status = answerMatch.confidence >= 0.7 ? 'answered' : 'partial'
      result.matchedValue = answerMatch.value
      result.matchSource = 'prior_answer'
      result.matchSourceDetail = answerMatch.detail
      result.confidence = answerMatch.confidence
      result.matchReason = answerMatch.reason
      result.internalQuestionId = answerMatch.questionId
      result.internalAnswerId = answerMatch.answerId
    }

    // If no good answer match, try extraction data
    if (!result.matchedValue || result.confidence < 0.6) {
      const extractionMatch = matchFromExtractionData(extQ, extractionItems)
      if (extractionMatch && extractionMatch.confidence >= 0.4 && extractionMatch.confidence > result.confidence) {
        result.status = extractionMatch.confidence >= 0.7 ? 'answered' : 'partial'
        result.matchedValue = extractionMatch.value
        result.matchSource = 'extraction'
        result.matchSourceDetail = extractionMatch.detail
        result.confidence = extractionMatch.confidence
        result.matchReason = extractionMatch.reason
        result.extractionItemId = extractionMatch.itemId
        result.internalQuestionId = null
        result.internalAnswerId = null
      }
    }

    // Tally
    if (result.status === 'answered') {
      answeredCount++
      totalConfidence += result.confidence
    } else if (result.status === 'partial') {
      partialCount++
      totalConfidence += result.confidence
    } else {
      unmatchedCount++
      if (result.required) requiredUnmatchedCount++
    }

    results.push(result)
  }

  const total = results.length
  const overallConfidence = total > 0 ? totalConfidence / total : 0

  return {
    questions: results,
    summary: {
      total,
      answered: answeredCount,
      partial: partialCount,
      unmatched: unmatchedCount,
      requiredUnmatched: requiredUnmatchedCount,
      overallConfidence: Math.round(overallConfidence * 100) / 100,
    },
    metadata: {
      documentTitle: metadata?.documentTitle || null,
      requestingOrganization: metadata?.requestingOrganization || null,
      referencedRegulations: metadata?.referencedRegulations || [],
    },
  }
}
