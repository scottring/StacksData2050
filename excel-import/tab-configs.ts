/**
 * Excel Tab Configuration for P&P VIS HQ v2.1 Template
 *
 * This configuration defines the layout of each tab in the Excel template:
 * - Where to find question text (for matching to database)
 * - Where to find answer values
 * - Where list tables are located
 *
 * Template: P&P VIS HQ - Final - v2.1
 */

export interface ListTableConfig {
  // List table region within the tab
  questionId?: string;  // Optional: specific question ID this list table belongs to
  startRow: number;     // First data row of the list table
  endRow: number;       // Last data row (or -1 for "until empty")
  columns: string[];    // Column letters containing data
  columnNames?: string[]; // Human-readable column names for mapping
}

export interface TabConfig {
  // Tab identification
  tabName: string;  // Exact name in Excel

  // Question matching
  questionColumn: string;  // Column letter where question text appears
  questionTextStartRow: number;  // First row with question text

  // Answer extraction
  answerColumn: string;  // Primary answer column (dropdown answers)
  answerStartRow: number;  // First row with answers
  commentColumn?: string;  // Optional: column for additional comments

  // List tables (if any)
  listTables: ListTableConfig[];

  // Special handling
  skipRows?: number[];  // Row numbers to skip (headers, separators, etc.)
  sectionHeaderRows?: number[];  // Rows that are section headers, not questions

  // Explicit row→question mappings (overrides fuzzy matching)
  // Use when text-based matching fails due to similar/repeated questions
  explicitMappings?: { [row: number]: string };  // row → question fullNumber
}

/**
 * P&P VIS HQ v2.1 Template Configuration
 */
export const TAB_CONFIGS: TabConfig[] = [
  {
    tabName: "Supplier Product Contact",
    questionColumn: "B",      // Labels like "Company Name", "Trade Name", etc.
    questionTextStartRow: 10,
    answerColumn: "C",        // Supplier fills in column C
    answerStartRow: 10,
    listTables: [],
    skipRows: [1, 2, 3, 4, 5, 6, 7, 8, 9],  // Header/instruction rows
    sectionHeaderRows: [7, 9, 18]  // "General Supplier", "Supplier", "Product"
  },
  {
    tabName: "Food Contact",
    questionColumn: "B",      // Questions like "Can the product be used..."
    questionTextStartRow: 4,
    answerColumn: "G",        // Dropdown answers
    answerStartRow: 4,
    commentColumn: "H",       // Additional comments
    listTables: [
      {
        // BfR/Chemical restrictions list table
        startRow: 20,
        endRow: -1,
        columns: ["D", "E", "F", "G", "I", "J", "K"],
        columnNames: ["CAS Number", "FCM Number", "SML (mg/kg)", "Chemical Name", "Conc. and Unit", "Restrictions", "Comments"]
      }
    ],
    skipRows: [1, 2, 3],
    sectionHeaderRows: [10, 14]  // Section headers within the tab
  },
  {
    tabName: "Ecolabels",
    questionColumn: "A",      // Questions like "Does the product meet..."
    questionTextStartRow: 4,
    answerColumn: "F",        // Dropdown answers
    answerStartRow: 5,        // Answers start at row 5 (after header row)
    commentColumn: "G",       // "Please specify applicable limitations"
    listTables: [],
    skipRows: [1, 2],
    sectionHeaderRows: [3, 15, 33, 39, 45]  // "EU Ecolabel", "Nordic Ecolabel", "Blue Angel", etc.
  },
  {
    tabName: "Biocides",
    questionColumn: "A",      // Questions like "According to Regulation (EU)..."
    questionTextStartRow: 4,
    answerColumn: "D",        // Dropdown answers
    answerStartRow: 4,
    commentColumn: "E",
    listTables: [
      {
        // Biocide substances list table (3.2)
        questionId: "3.2",    // "If yes, please specify the substance..."
        startRow: 6,
        endRow: 17,  // Until row 17, then questions resume at 18
        columns: ["E", "F", "G", "H"],
        columnNames: ["Chemical Name", "CAS Number", "EC Number", "Concentration"]
      }
    ],
    skipRows: [1, 2, 3],
    sectionHeaderRows: [2],
    // Explicit row→question mappings for Biocides (similar repeated questions)
    // PT 6 (in-can preservation): 3.3 → 3.4 → 3.5
    // PT 12 (slimicides): 3.6 → [3.7 missing!] → 3.8
    // PT 11 (preservatives): 3.9 → 3.10 → 3.11
    // Use "SKIP" to explicitly skip a row (prevent false fuzzy matches)
    explicitMappings: {
      4: "3.1",    // Contains biocides?
      19: "3.3",   // PT 6 used?
      22: "3.4",   // PT 6 Article 95?
      25: "3.5",   // PT 6 supplier?
      28: "3.6",   // PT 12 used?
      31: "SKIP",  // PT 12 Article 95 - MISSING IN DATABASE (3.7 doesn't exist)
      34: "3.8",   // PT 12 supplier?
      37: "3.9",   // PT 11 used?
      40: "3.10",  // PT 11 Article 95?
      43: "3.11",  // PT 11 supplier?
    }
  },
  {
    tabName: "PIDSL",
    questionColumn: "B",      // Questions like "Does the product contain..."
    questionTextStartRow: 5,
    answerColumn: "G",        // Dropdown answers
    answerStartRow: 5,
    commentColumn: "H",
    listTables: [
      {
        // PIDSL substances list table
        startRow: 7,
        endRow: -1,  // Until empty
        columns: ["H", "I", "J", "K"],
        columnNames: ["Chemical name", "CAS Number", "EC Number", "Concentration"]
      }
    ],
    skipRows: [1, 2, 3, 4],
    sectionHeaderRows: [3]  // "General Section"
  },
  {
    tabName: "Additional Requirements",
    questionColumn: "B",
    questionTextStartRow: 4,
    answerColumn: "F",
    answerStartRow: 4,
    commentColumn: "G",
    listTables: [],
    skipRows: [1, 2, 3],
    sectionHeaderRows: []
  }
];

/**
 * Get config for a specific tab
 */
export function getTabConfig(tabName: string): TabConfig | undefined {
  return TAB_CONFIGS.find(c =>
    c.tabName.toLowerCase() === tabName.toLowerCase()
  );
}

/**
 * Column letter to 0-based index
 */
export function columnToIndex(col: string): number {
  let result = 0;
  for (let i = 0; i < col.length; i++) {
    result = result * 26 + (col.charCodeAt(i) - 64);
  }
  return result - 1;  // 0-based
}

/**
 * 0-based index to column letter
 */
export function indexToColumn(idx: number): string {
  let result = '';
  idx += 1;  // 1-based for calculation
  while (idx > 0) {
    const rem = (idx - 1) % 26;
    result = String.fromCharCode(65 + rem) + result;
    idx = Math.floor((idx - 1) / 26);
  }
  return result;
}
