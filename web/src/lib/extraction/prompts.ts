import type Anthropic from '@anthropic-ai/sdk'

// System prompt for all extraction types
const EXTRACTION_SYSTEM_PROMPT = `You are a regulatory chemistry expert specializing in chemical compliance data extraction. You extract structured chemical, safety, and regulatory data from supplier documents with high accuracy.

Rules:
- Extract ALL chemical substances mentioned, including solvents, carriers, and additives
- Use standard CAS number format (digits-digits-digits, e.g., 7732-18-5)
- Report concentrations as percentages where possible
- If a value is approximate or a range, report both min and max
- Set confidence to 1.0 for clearly stated values, 0.8 for inferred values, 0.5 for uncertain values
- Never fabricate data — if something is not present in the document, do not include it
- Documents may be in non-standard formats (Excel spreadsheets, custom tables, multi-sheet workbooks). Intelligently map whatever data you find to the requested schema, even if column headers don't match exactly.
- Look for chemical data in any column that could contain CAS numbers, chemical names, concentrations, or material descriptions.`

// ============================================================
// SDS (Safety Data Sheet) extraction
// ============================================================

export const SDS_TOOL: Anthropic.Tool = {
  name: 'extract_sds_data',
  description: 'Extract structured chemical and safety data from a Safety Data Sheet (SDS)',
  input_schema: {
    type: 'object' as const,
    properties: {
      product_name: { type: 'string', description: 'Product or trade name' },
      manufacturer: { type: 'string', description: 'Manufacturer or supplier name' },
      sds_date: { type: 'string', description: 'SDS revision date (ISO format YYYY-MM-DD)' },
      revision_number: { type: 'string', description: 'SDS revision number' },
      chemicals: {
        type: 'array',
        description: 'All chemical substances listed in the composition section',
        items: {
          type: 'object',
          properties: {
            cas_number: { type: 'string', description: 'CAS registry number (e.g., 68784-12-3)' },
            chemical_name: { type: 'string', description: 'Chemical name or identifier' },
            concentration_min_pct: { type: 'number', description: 'Minimum concentration in weight %' },
            concentration_max_pct: { type: 'number', description: 'Maximum concentration in weight %' },
            function_in_product: { type: 'string', description: 'Function or role in the product (e.g., sizing agent, surfactant)' },
            confidence: { type: 'number', description: 'Confidence score 0-1' },
          },
          required: ['chemical_name', 'confidence'],
        },
      },
      hazards: {
        type: 'object',
        properties: {
          ghs_classification: {
            type: 'array',
            items: { type: 'string' },
            description: 'GHS hazard classification codes (e.g., H302, H315)',
          },
          signal_word: {
            type: 'string',
            enum: ['Danger', 'Warning', 'None'],
            description: 'GHS signal word',
          },
          hazard_statements: {
            type: 'array',
            items: { type: 'string' },
            description: 'Full hazard statements (e.g., "H302 - Harmful if swallowed")',
          },
          precautionary_statements: {
            type: 'array',
            items: { type: 'string' },
            description: 'Precautionary statements',
          },
        },
      },
      physical_properties: {
        type: 'object',
        properties: {
          appearance: { type: 'string' },
          odor: { type: 'string' },
          ph: { type: 'string' },
          boiling_point: { type: 'string' },
          flash_point: { type: 'string' },
          density: { type: 'string' },
          viscosity: { type: 'string' },
          solubility: { type: 'string' },
        },
      },
      traceability: {
        type: 'object',
        properties: {
          batch_number: { type: 'string' },
          manufacturing_site: { type: 'string' },
          country_of_origin: { type: 'string' },
        },
      },
    },
    required: ['product_name', 'chemicals'],
  },
}

// ============================================================
// CoA (Certificate of Analysis) extraction
// ============================================================

export const COA_TOOL: Anthropic.Tool = {
  name: 'extract_coa_data',
  description: 'Extract structured test results and batch data from a Certificate of Analysis (CoA)',
  input_schema: {
    type: 'object' as const,
    properties: {
      product_name: { type: 'string' },
      manufacturer: { type: 'string' },
      batch_number: { type: 'string' },
      manufacturing_date: { type: 'string', description: 'ISO date' },
      expiry_date: { type: 'string', description: 'ISO date' },
      test_results: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            test_name: { type: 'string', description: 'Name of the test (e.g., Viscosity, pH, Solids Content)' },
            method: { type: 'string', description: 'Test method if specified' },
            result_value: { type: 'string', description: 'Measured result value with units' },
            specification: { type: 'string', description: 'Specification or acceptance range' },
            pass: { type: 'boolean', description: 'Whether the result meets specification' },
            confidence: { type: 'number' },
          },
          required: ['test_name', 'result_value', 'confidence'],
        },
      },
      traceability: {
        type: 'object',
        properties: {
          batch_number: { type: 'string' },
          lot_number: { type: 'string' },
          manufacturing_site: { type: 'string' },
          tested_by: { type: 'string' },
          test_date: { type: 'string' },
        },
      },
    },
    required: ['product_name', 'test_results'],
  },
}

// ============================================================
// Lab Report extraction (migration testing, etc.)
// ============================================================

export const LAB_REPORT_TOOL: Anthropic.Tool = {
  name: 'extract_lab_report_data',
  description: 'Extract structured test results from a laboratory report (e.g., migration testing per EU 10/2011)',
  input_schema: {
    type: 'object' as const,
    properties: {
      product_name: { type: 'string' },
      lab_name: { type: 'string' },
      report_number: { type: 'string' },
      test_date: { type: 'string', description: 'ISO date' },
      regulation: { type: 'string', description: 'Regulation tested against (e.g., EU 10/2011)' },
      test_conditions: {
        type: 'object',
        properties: {
          simulant: { type: 'string', description: 'Food simulant used (e.g., 10% Ethanol)' },
          temperature: { type: 'string' },
          duration: { type: 'string' },
        },
      },
      test_results: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            substance: { type: 'string', description: 'Substance tested' },
            cas_number: { type: 'string' },
            sml_limit: { type: 'number', description: 'Specific Migration Limit (mg/kg)' },
            sml_unit: { type: 'string', description: 'Unit for SML (usually mg/kg)' },
            result_value: { type: 'number', description: 'Measured value' },
            result_unit: { type: 'string' },
            below_detection: { type: 'boolean', description: 'Whether result was below detection limit' },
            pass: { type: 'boolean' },
            confidence: { type: 'number' },
          },
          required: ['substance', 'confidence'],
        },
      },
    },
    required: ['product_name', 'test_results'],
  },
}

// ============================================================
// SAP CSV extraction
// ============================================================

export const SAP_CSV_TOOL: Anthropic.Tool = {
  name: 'extract_sap_data',
  description: 'Extract structured material and composition data from an SAP export (CSV or table format)',
  input_schema: {
    type: 'object' as const,
    properties: {
      materials: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            material_number: { type: 'string' },
            description: { type: 'string' },
            cas_number: { type: 'string' },
            concentration_pct: { type: 'number' },
            unit: { type: 'string' },
            confidence: { type: 'number' },
          },
          required: ['description', 'confidence'],
        },
      },
      batch_info: {
        type: 'object',
        properties: {
          batch_number: { type: 'string' },
          production_site: { type: 'string' },
          production_date: { type: 'string' },
        },
      },
    },
    required: ['materials'],
  },
}

// ============================================================
// Questionnaire extraction (reverse ingestion)
// Extracts QUESTIONS from external questionnaires, not data
// ============================================================

const QUESTIONNAIRE_SYSTEM_PROMPT = `You are a regulatory compliance expert who analyzes supplier questionnaires and data request forms. Your job is to extract every question, parameter, or data requirement from a document — not to answer them, but to identify what is being asked.

Rules:
- Extract EVERY question or data field requested, even if it seems redundant
- Preserve the original numbering/hierarchy if present (section, subsection, question number)
- Identify the expected answer type (text, number, yes/no, date, chemical list, file upload, etc.)
- Categorize each question into a domain (composition, hazards, physical_properties, testing, traceability, regulatory, general)
- If the questionnaire references specific regulations (REACH, TSCA, BfR, etc.), note them
- Set confidence to 1.0 for clearly stated questions, 0.8 for implied/inferred requirements, 0.5 for ambiguous items
- Never fabricate questions — only extract what is actually in the document
- Documents may be Excel spreadsheets where each row is a question, or PDFs with numbered sections. Handle both formats.

IMPORTANT — Handling spreadsheets with answer columns:
- Questionnaire spreadsheets often have both a "Question" column and an "Answer" column (or similar — "Response", "Value", "Data", "Input", etc.)
- Your job is to extract the QUESTIONS only. Ignore the answer/response values entirely.
- Look for the column(s) that contain the question text, field labels, or parameter names. That is what you should extract.
- Do NOT confuse answer values (like CAS numbers, percentages, "Yes"/"No", dates) for questions.
- Column headers like "Question", "Parameter", "Requirement", "Field", "Item", "Description" indicate question columns.
- Column headers like "Answer", "Response", "Value", "Data", "Result", "Input", "Supplier Response" indicate answer columns — skip these.`

export const QUESTIONNAIRE_TOOL: Anthropic.Tool = {
  name: 'extract_questionnaire',
  description: 'Extract all questions, parameters, and data requirements from a supplier questionnaire or data request form',
  input_schema: {
    type: 'object' as const,
    properties: {
      questions: {
        type: 'array',
        description: 'Every individual question or data field requested',
        items: {
          type: 'object',
          properties: {
            question_number: { type: 'string', description: 'Original question number (e.g., "1.2.3", "Q15", "A.1")' },
            section_name: { type: 'string', description: 'Which section this question belongs to' },
            question_text: { type: 'string', description: 'The full text of the question or field label' },
            expected_type: {
              type: 'string',
              enum: ['text', 'number', 'yes_no', 'date', 'chemical_list', 'file', 'choice', 'table'],
              description: 'Expected answer format',
            },
            domain: {
              type: 'string',
              enum: ['composition', 'hazards', 'physical_properties', 'testing', 'traceability', 'regulatory', 'general'],
              description: 'Compliance domain this question relates to',
            },
            required: { type: 'boolean', description: 'Whether this question is marked as required/mandatory' },
            choices: {
              type: 'array',
              items: { type: 'string' },
              description: 'If multiple choice, the available options',
            },
            regulation_reference: { type: 'string', description: 'Specific regulation this question references' },
            confidence: { type: 'number', description: 'Confidence in extraction accuracy (0-1)' },
          },
          required: ['question_text', 'expected_type', 'domain', 'confidence'],
        },
      },
      document_title: { type: 'string', description: 'Title or name of the questionnaire' },
      requesting_organization: { type: 'string', description: 'Organization that created this questionnaire' },
      referenced_regulations: {
        type: 'array',
        items: { type: 'string' },
        description: 'Regulations or standards referenced (e.g., REACH, TSCA, EU 10/2011, BfR)',
      },
      sections: {
        type: 'array',
        description: 'Top-level sections or categories in the questionnaire',
        items: {
          type: 'object',
          properties: {
            section_number: { type: 'string', description: 'Section number (e.g., "1", "2.3", "A")' },
            section_name: { type: 'string', description: 'Section title or heading' },
          },
          required: ['section_name'],
        },
      },
    },
    required: ['questions'],
  },
}

// ============================================================
// Filled Questionnaire extraction (reverse ingestion)
// Extracts QUESTIONS + ANSWERS from completed questionnaires
// ============================================================

const QUESTIONNAIRE_FILLED_SYSTEM_PROMPT = `You are a regulatory compliance expert who analyzes completed supplier questionnaires. Your job is to extract every question AND its corresponding answer from a filled-out questionnaire document.

Rules:
- Extract EVERY question or data field along with its answer/response value
- Preserve the original numbering/hierarchy if present (section, subsection, question number)
- The question_text should contain ONLY the question — the answer goes in answer_value
- If a question has no answer (blank/empty), still extract it with an empty answer_value
- Identify the expected answer type (text, number, yes/no, date, chemical list, file upload, etc.)
- Categorize each question into a domain (composition, hazards, physical_properties, testing, traceability, regulatory, general)
- If the questionnaire references specific regulations (REACH, TSCA, BfR, etc.), note them
- Set confidence to 1.0 for clearly stated question/answer pairs, 0.8 for inferred, 0.5 for ambiguous
- Never fabricate data — only extract what is actually in the document
- For spreadsheets: the question is typically in one column, the answer in another. Map them correctly.
- For PDFs: questions may have answers inline, below them, or in adjacent fields.`

export const QUESTIONNAIRE_FILLED_TOOL: Anthropic.Tool = {
  name: 'extract_filled_questionnaire',
  description: 'Extract all questions AND their answers from a completed supplier questionnaire',
  input_schema: {
    type: 'object' as const,
    properties: {
      questions: {
        type: 'array',
        description: 'Every question with its answer value',
        items: {
          type: 'object',
          properties: {
            question_number: { type: 'string', description: 'Original question number (e.g., "1.2.3", "Q15", "A.1")' },
            section_name: { type: 'string', description: 'Which section this question belongs to' },
            question_text: { type: 'string', description: 'The full text of the question or field label (NOT the answer)' },
            answer_value: { type: 'string', description: 'The answer/response value exactly as written in the document. Empty string if unanswered.' },
            expected_type: {
              type: 'string',
              enum: ['text', 'number', 'yes_no', 'date', 'chemical_list', 'file', 'choice', 'table'],
              description: 'Answer format',
            },
            domain: {
              type: 'string',
              enum: ['composition', 'hazards', 'physical_properties', 'testing', 'traceability', 'regulatory', 'general'],
              description: 'Compliance domain this question relates to',
            },
            required: { type: 'boolean', description: 'Whether this question is marked as required/mandatory' },
            regulation_reference: { type: 'string', description: 'Specific regulation this question references' },
            confidence: { type: 'number', description: 'Confidence in extraction accuracy (0-1)' },
          },
          required: ['question_text', 'answer_value', 'domain', 'confidence'],
        },
      },
      document_title: { type: 'string', description: 'Title or name of the questionnaire' },
      requesting_organization: { type: 'string', description: 'Organization that created this questionnaire' },
      referenced_regulations: {
        type: 'array',
        items: { type: 'string' },
        description: 'Regulations or standards referenced (e.g., REACH, TSCA, EU 10/2011, BfR)',
      },
      sections: {
        type: 'array',
        description: 'Top-level sections or categories in the questionnaire',
        items: {
          type: 'object',
          properties: {
            section_number: { type: 'string', description: 'Section number (e.g., "1", "2.3", "A")' },
            section_name: { type: 'string', description: 'Section title or heading' },
          },
          required: ['section_name'],
        },
      },
    },
    required: ['questions'],
  },
}

// Map document types to their tools and prompts
export function getExtractionConfig(documentType: string) {
  switch (documentType) {
    case 'sds':
      return {
        tool: SDS_TOOL,
        systemPrompt: EXTRACTION_SYSTEM_PROMPT,
        userPrompt: 'Extract all chemical, safety, hazard, and composition data from this Safety Data Sheet. Include every substance listed in Section 3 (Composition), all GHS hazard classifications from Section 2, physical properties from Section 9, and any traceability information.',
      }
    case 'coa':
      return {
        tool: COA_TOOL,
        systemPrompt: EXTRACTION_SYSTEM_PROMPT,
        userPrompt: 'Extract all test results, batch information, and quality data from this Certificate of Analysis. Include every test with its result, specification, and pass/fail status.',
      }
    case 'lab_report':
      return {
        tool: LAB_REPORT_TOOL,
        systemPrompt: EXTRACTION_SYSTEM_PROMPT,
        userPrompt: 'Extract all test results from this laboratory report. Include the regulation tested against, test conditions (simulant, temperature, duration), and every substance tested with its migration limit and measured result.',
      }
    case 'sap_csv':
      return {
        tool: SAP_CSV_TOOL,
        systemPrompt: EXTRACTION_SYSTEM_PROMPT,
        userPrompt: 'Extract all material composition data from this SAP export. Include material numbers, descriptions, CAS numbers, and concentrations for each component.',
      }
    case 'questionnaire':
      return {
        tool: QUESTIONNAIRE_TOOL,
        systemPrompt: QUESTIONNAIRE_SYSTEM_PROMPT,
        userPrompt: `Extract every question, parameter, and data requirement from this document. This is a supplier questionnaire or data request form — your job is to identify WHAT is being asked, not to answer the questions.

CRITICAL: If this spreadsheet contains answer/response columns alongside the questions, IGNORE the answers entirely. Only extract the question text, field labels, and parameter names. Do not include answer values in the question_text field.

For each question, determine:
1. The full question text exactly as written (from the question/parameter column, NOT the answer column)
2. What section/category it belongs to
3. What type of answer is expected (text, number, yes/no, date, chemical list, etc.)
4. Which compliance domain it relates to (composition, hazards, testing, etc.)
5. Whether it's marked as required/mandatory
6. Any specific regulation it references

Extract ALL questions — even very simple ones like "Product name" or "Date". Miss nothing.`,
      }
    case 'questionnaire_filled':
      return {
        tool: QUESTIONNAIRE_FILLED_TOOL,
        systemPrompt: QUESTIONNAIRE_FILLED_SYSTEM_PROMPT,
        userPrompt: `Extract every question AND its answer from this completed questionnaire. This document has already been filled out — your job is to extract both what was asked AND what was answered.

For each row/item:
1. Extract the question text (field label, parameter name, or question) into question_text
2. Extract the corresponding answer/response value into answer_value
3. Keep them strictly separate — question_text is the QUESTION, answer_value is the ANSWER
4. If a question has no answer (blank cell, "N/A", "TBD"), set answer_value to an empty string
5. Categorize the domain and expected type

For spreadsheets: typically one column has questions and another has answers. Identify which is which from the headers.
For PDFs: answers may appear inline, in adjacent cells, or below the question.

Extract ALL question/answer pairs. Miss nothing.`,
      }
    case 'other':
    default:
      return {
        tool: SDS_TOOL,
        systemPrompt: EXTRACTION_SYSTEM_PROMPT,
        userPrompt: `Extract all chemical and compliance data from this document. This may be a non-standard format (spreadsheet, internal report, supplier questionnaire response, etc.).

Look for:
- Chemical substances with CAS numbers and names (map to the "chemicals" array)
- Concentration/percentage data for each substance
- Any hazard classifications, GHS codes, or safety data
- Physical properties (appearance, pH, density, etc.)
- Traceability info (batch numbers, dates, sites)

Map whatever data you find to the structured schema as best you can. Use the product_name field for the overall product or document title.`,
      }
  }
}
