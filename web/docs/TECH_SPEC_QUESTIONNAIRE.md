# Technical Specification: Questionnaire System
## Stacks Data - Supabase/Next.js Implementation

**Version:** 1.0
**Last Updated:** December 30, 2024
**Status:** Draft
**Author:** Development Team

---

## Table of Contents

1. [Overview](#1-overview)
2. [System Architecture](#2-system-architecture)
3. [Data Model](#3-data-model)
4. [Question Types Specification](#4-question-types-specification)
5. [Component Architecture](#5-component-architecture)
6. [State Management](#6-state-management)
7. [API Layer](#7-api-layer)
8. [UI/UX Specifications](#8-uiux-specifications)
   - 8.1 [Section & Subsection Navigation](#81-section--subsection-navigation)
   - 8.2 [Question Action Icons](#82-question-action-icons)
   - 8.3 [Conditional Question Indicators](#83-conditional-question-indicators)
   - 8.4 [Locked Answer State](#84-locked-answer-state)
   - 8.5 [Add Note Feature](#85-add-note-feature)
   - 8.6 [Visual Design System](#86-visual-design-system)
   - 8.7 [Question Layout Pattern](#87-question-layout-pattern)
   - 8.8 [Repeatable Table Layout](#88-repeatable-table-layout)
   - 8.9 [Interaction Patterns](#89-interaction-patterns)
9. [Technical Implementation Details](#9-technical-implementation-details)
10. [Performance Considerations](#10-performance-considerations)

---

## 1. Overview

### 1.1 Purpose

This document specifies the technical architecture for rebuilding the questionnaire/sheet system from Bubble.io to Supabase/Next.js, maintaining feature parity while improving performance and maintainability.

### 1.2 Goals

- **Feature Parity**: Replicate all question types and functionality from Bubble.io
- **Performance**: Sub-2-second page loads, auto-save within 500ms
- **Scalability**: Support 10,000+ questions, 1M+ answers
- **Maintainability**: Clean component architecture with TypeScript
- **User Experience**: Seamless, responsive interface matching Bubble.io UX patterns

### 1.3 Technology Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Frontend | Next.js 14 (App Router) | React framework with SSR |
| UI Components | shadcn/ui + Tailwind CSS | Component library and styling |
| State Management | React Hook Form + Zustand | Form state and global state |
| Database | Supabase (PostgreSQL) | Backend and real-time features |
| Authentication | Supabase Auth | User authentication |
| Type Safety | TypeScript | Type checking |
| API Layer | Server Actions + API Routes | Server-side logic |

---

## 2. System Architecture

### 2.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENT LAYER                             │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │              Next.js App Router Pages                     │   │
│  │  /sheets/[sheetId]  │  /sheets/[sheetId]/section/[id]   │   │
│  └──────────────────────────────────────────────────────────┘   │
│                              │                                    │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                  React Components                         │   │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────────────┐ │   │
│  │  │ Question   │  │ Repeatable │  │  Section          │ │   │
│  │  │ Renderer   │  │ Table      │  │  Navigation       │ │   │
│  │  └────────────┘  └────────────┘  └────────────────────┘ │   │
│  └──────────────────────────────────────────────────────────┘   │
│                              │                                    │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │              State Management Layer                       │   │
│  │    React Hook Form  │  Zustand Store  │  Query Cache     │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                         API LAYER                                │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │              Server Actions & API Routes                  │   │
│  │  saveAnswer()  │  loadSheet()  │  validateQuestion()     │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      SUPABASE LAYER                              │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                PostgreSQL Database                        │   │
│  │  questions │ answers │ sheets │ list_tables │ choices    │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │              Row Level Security (RLS)                     │   │
│  │         Tenant isolation by company_id                    │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 Page Structure

```
/sheets/[sheetId]
  └── Layout: Sheet header, progress, navigation
      ├── /section/[sectionId]
      │   └── Questions for that section
      │       ├── Question components
      │       ├── Conditional logic handling
      │       └── Auto-save on change
      └── /overview
          └── Summary of all answers
```

---

## 3. Data Model

### 3.1 Core Tables (Existing)

#### 3.1.1 questions Table
```typescript
interface Question {
  id: string;                    // UUID
  name: string | null;           // Question identifier
  content: string | null;        // Question text
  question_description: string | null;  // Help text
  clarification: string | null;  // Follow-up question text
  clarification_yes_no: boolean; // If true, show clarification based on yes/no answer
  question_type: string | null;  // "text" | "select_one" | "list_table" | etc.
  required: boolean;             // Is this question required?
  order_number: number | null;   // Sort order within subsection
  parent_section_id: string | null;     // FK to sections
  parent_subsection_id: string | null;  // FK to subsections
  parent_choice_id: string | null;      // FK to choices (for conditional questions)
  list_table_id: string | null;  // FK to list_tables (for table questions)
  support_file_requested: boolean; // Request supporting document
  support_file_reason: string | null;
  // ... other fields from migration
}
```

#### 3.1.2 answers Table
```typescript
interface Answer {
  id: string;                    // UUID
  sheet_id: string | null;       // FK to sheets
  company_id: string | null;     // FK to companies (supplier)
  parent_question_id: string | null;  // FK to questions
  originating_question_id: string | null; // Original question (for answer reuse)

  // Value fields (only one should be populated based on question type)
  text_value: string | null;
  text_area_value: string | null;
  number_value: number | null;
  boolean_value: boolean | null;
  date_value: Date | null;
  choice_id: string | null;      // FK to choices (for select questions)
  file_url: string | null;
  support_file_url: string | null;

  // For list table answers
  list_table_row_id: string | null;  // FK to list_table_rows
  list_table_column_id: string | null; // FK to list_table_columns

  // Metadata
  created_at: Date;
  modified_at: Date;
  created_by: string | null;     // FK to users
}
```

#### 3.1.3 list_tables Table
```typescript
interface ListTable {
  id: string;
  name: string | null;
  created_at: Date;
  modified_at: Date;
}
```

#### 3.1.4 list_table_columns Table
```typescript
interface ListTableColumn {
  id: string;
  name: string;                  // Column header
  response_type: string | null;  // "text" | "number" | "select" | etc.
  order_number: number | null;   // Column order
  parent_table_id: string | null; // FK to list_tables
}
```

#### 3.1.5 list_table_rows Table
```typescript
interface ListTableRow {
  id: string;
  row_id: number | null;         // Row number
  table_id: string | null;       // FK to list_tables
  created_at: Date;
  modified_at: Date;
}
```

#### 3.1.6 choices Table
```typescript
interface Choice {
  id: string;
  content: string | null;        // Choice text
  parent_question_id: string | null; // FK to questions
  order_number: number | null;   // Choice order
}
```

### 3.2 Question Type Mapping

Based on the Bubble.io analysis, here's how question types map to the database:

| Bubble.io UI | `question_type` Value | Data Storage | Additional Tables |
|-------------|----------------------|--------------|-------------------|
| Text Input (Single Line) | `"text"` | `answers.text_value` | None |
| Text Area (Multi-line) | `"text_area"` | `answers.text_area_value` | None |
| Radio Buttons (Select 1) | `"select_one"` | `answers.choice_id` | `choices` |
| Dropdown Select | `"select_one"` | `answers.choice_id` | `choices` |
| Checkbox (Select Many) | `"select_multiple"` | `answer_text_choices` | `choices` |
| Number Input | `"number"` | `answers.number_value` | None |
| Date Picker | `"date"` | `answers.date_value` | None |
| File Upload | `"file"` | `answers.file_url` | None |
| List Table | `"list_table"` | `answers` (per cell) | `list_tables`, `list_table_columns`, `list_table_rows` |

---

## 4. Question Types Specification

### 4.1 Text Input (Single Line)

**UI Example**: Questions 1.2.1, 1.2.2, 1.2.3 (Product Description, Product Code, Function in Application)

**Data Structure**:
```typescript
{
  question_type: "text",
  required: boolean,
  content: "Product Description",
  question_description: null
}

// Answer stored as:
{
  parent_question_id: question.id,
  text_value: "User's input text here"
}
```

**Component Props**:
```typescript
interface TextInputProps {
  question: Question;
  value: string | null;
  onChange: (value: string) => void;
  onBlur: () => void;
  error?: string;
  disabled?: boolean;
}
```

**Validation Rules**:
- Max length: 255 characters
- Required check if `question.required === true`
- Trim whitespace on save

---

### 4.2 Text Area (Multi-line)

**UI Example**: Question 1.1.1 "Add disclaimer (optional)"

**Data Structure**:
```typescript
{
  question_type: "text_area",
  required: boolean,
  content: "Add disclaimer (optional)",
  question_description: null
}

// Answer stored as:
{
  parent_question_id: question.id,
  text_area_value: "Multi-line\ntext\nhere"
}
```

**Component Props**:
```typescript
interface TextAreaProps {
  question: Question;
  value: string | null;
  onChange: (value: string) => void;
  onBlur: () => void;
  rows?: number;  // Default: 4
  maxLength?: number;  // Default: 10000
  error?: string;
  disabled?: boolean;
}
```

**Validation Rules**:
- Max length: 10,000 characters
- Required check if `question.required === true`
- Preserve line breaks

---

### 4.3 Radio Buttons (Select 1)

**UI Example**: Questions 2.1.1, 4.12.6, 5.1.5

**Data Structure**:
```typescript
// Question
{
  question_type: "select_one",
  required: boolean,
  content: "Does the product comply with..."
}

// Choices (related via parent_question_id)
[
  { id: "choice-1", content: "Yes", order_number: 1 },
  { id: "choice-2", content: "No", order_number: 2 },
  { id: "choice-3", content: "Not assessed", order_number: 3 },
  { id: "choice-4", content: "Not applicable", order_number: 4 }
]

// Answer stored as:
{
  parent_question_id: question.id,
  choice_id: "choice-3"  // Selected choice
}
```

**Component Props**:
```typescript
interface RadioButtonGroupProps {
  question: Question;
  choices: Choice[];
  selectedChoiceId: string | null;
  onChange: (choiceId: string) => void;
  error?: string;
  disabled?: boolean;
}
```

**Rendering Logic**:
- Display choices in `order_number` sequence
- Render as vertical stack of radio buttons
- Show selected state with filled circle
- Support keyboard navigation (arrow keys)

---

### 4.4 Dropdown Select

**UI Example**: Questions 2.1.3, 5.1.8

**Data Structure**:
```typescript
// Same as Radio Buttons, but rendered differently
{
  question_type: "select_one",
  required: boolean,
  content: "Does the product..."
}

// When question has >5 choices OR explicitly marked for dropdown
// Render as dropdown instead of radio buttons
```

**Component Props**:
```typescript
interface DropdownSelectProps {
  question: Question;
  choices: Choice[];
  selectedChoiceId: string | null;
  onChange: (choiceId: string) => void;
  placeholder?: string;  // Default: "Choose an option..."
  error?: string;
  disabled?: boolean;
}
```

**UI Behavior**:
- Show placeholder when no selection
- Searchable if >10 choices
- Keyboard accessible (type to filter)

---

### 4.5 List Table (Repeating Groups)

**UI Example**: Questions 4.8.1 (2 cols), 4.13.2 & 4.13.3 (7 cols), 5.1.14.1 (in modal)

**Data Structure**:
```typescript
// Question
{
  question_type: "list_table",
  required: boolean,
  content: "Suppliers of Base Polymers...",
  list_table_id: "table-123"
}

// List Table
{
  id: "table-123",
  name: "Base Polymers Table"
}

// List Table Columns
[
  { id: "col-1", name: "Chemical name", response_type: "text", order_number: 1 },
  { id: "col-2", name: "CAS Number", response_type: "text", order_number: 2 },
  { id: "col-3", name: "EC Number", response_type: "text", order_number: 3 },
  { id: "col-4", name: "Concentration", response_type: "text", order_number: 4 }
]

// Answers (one per cell)
// For a table with 2 rows and 4 columns = 8 answer records
[
  // Row 1
  {
    parent_question_id: question.id,
    list_table_row_id: "row-1",
    list_table_column_id: "col-1",
    text_value: "cites of respirable size"
  },
  {
    parent_question_id: question.id,
    list_table_row_id: "row-1",
    list_table_column_id: "col-2",
    text_value: "14808-60-7"
  },
  // ... more cells
]
```

**Component Props**:
```typescript
interface RepeatableTableProps {
  question: Question;
  table: ListTable;
  columns: ListTableColumn[];
  rows: TableRowData[];
  onAddRow: () => void;
  onDeleteRow: (rowId: string) => void;
  onCellChange: (rowId: string, columnId: string, value: any) => void;
  maxRows?: number;
  error?: string;
  disabled?: boolean;
}

interface TableRowData {
  rowId: string;
  cells: Record<string, any>;  // columnId -> value
}
```

**UI Features**:
- "+ Add a row" button (green)
- Delete row button (trash icon) on each row
- Row numbering (1, 2, 3...)
- Column navigation for wide tables ("< 7Col. >")
- Support for different column types (text, number, select, date)
- Empty state when no rows

---

### 4.6 Branching Logic / Conditional Questions

**UI Example**: Question 5.1.14.1 (appears when 5.1.14 = "Yes")

**Data Structure**:
```typescript
// Parent Question
{
  id: "q-514",
  question_type: "select_one",
  content: "Does the product contain substances...",
  clarification_yes_no: true,
  clarification: "If yes, please provide details..."
}

// Conditional Child Question
{
  id: "q-5141",
  question_type: "list_table",
  content: "Branching logic - substance details",
  parent_choice_id: "choice-yes",  // Only show if parent = "Yes" choice
  list_table_id: "table-substances"
}
```

**Rendering Logic**:
```typescript
// Pseudocode for conditional rendering
function shouldShowQuestion(question: Question, answers: Answer[]): boolean {
  if (!question.parent_choice_id) {
    return true;  // Not conditional, always show
  }

  // Find parent question's answer
  const parentAnswer = answers.find(a =>
    a.parent_question_id === getParentQuestionId(question)
  );

  // Show if parent answer matches required choice
  return parentAnswer?.choice_id === question.parent_choice_id;
}
```

**UI Indicators**:
- Red dot (●) indicator for conditional questions
- "If yes..." or "If no..." prefix in question text
- "Branching logic" label
- Smooth show/hide animation
- Clear visual hierarchy

---

## 5. Component Architecture

### 5.1 Component Hierarchy

```
SheetPage
├── SheetLayout
│   ├── SheetHeader
│   │   ├── CompanyLogo
│   │   ├── SheetTitle
│   │   └── ProgressIndicator
│   ├── SectionNavigation
│   │   ├── SectionList
│   │   └── SubsectionList
│   └── SheetContent
│       └── SectionView
│           ├── SectionHeader
│           ├── SubsectionList
│           │   └── SubsectionView
│           │       ├── QuestionList
│           │       │   └── QuestionRenderer
│           │       │       ├── TextInputQuestion
│           │       │       ├── TextAreaQuestion
│           │       │       ├── RadioButtonQuestion
│           │       │       ├── DropdownQuestion
│           │       │       ├── RepeatableTableQuestion
│           │       │       └── ConditionalWrapper
│           │       └── AddNoteButton
│           └── SectionActions
│               ├── SaveDraftButton
│               └── SubmitButton
└── AutoSaveIndicator
```

### 5.2 Core Components

#### 5.2.1 QuestionRenderer

**Purpose**: Route to correct question component based on type

**File**: `components/sheet/QuestionRenderer.tsx`

```typescript
interface QuestionRendererProps {
  question: Question;
  answer: Answer | null;
  choices?: Choice[];
  listTable?: ListTable;
  columns?: ListTableColumn[];
  onChange: (value: any) => void;
  onBlur: () => void;
  error?: string;
  disabled?: boolean;
}

export function QuestionRenderer({ question, answer, ...props }: QuestionRendererProps) {
  // Check if question should be visible (conditional logic)
  const isVisible = useConditionalVisibility(question);

  if (!isVisible) return null;

  switch (question.question_type) {
    case "text":
      return <TextInputQuestion question={question} value={answer?.text_value} {...props} />;
    case "text_area":
      return <TextAreaQuestion question={question} value={answer?.text_area_value} {...props} />;
    case "select_one":
      // Decide between radio or dropdown based on choice count
      const useDropdown = props.choices && props.choices.length > 5;
      return useDropdown
        ? <DropdownQuestion question={question} selectedId={answer?.choice_id} {...props} />
        : <RadioButtonQuestion question={question} selectedId={answer?.choice_id} {...props} />;
    case "list_table":
      return <RepeatableTableQuestion question={question} {...props} />;
    default:
      return <div>Unknown question type: {question.question_type}</div>;
  }
}
```

#### 5.2.2 RepeatableTableQuestion

**Purpose**: Render and manage list table questions with add/delete rows

**File**: `components/sheet/RepeatableTableQuestion.tsx`

```typescript
interface RepeatableTableQuestionProps {
  question: Question;
  listTable: ListTable;
  columns: ListTableColumn[];
  answers: Answer[];  // All answers for this table
  onChange: (rowId: string, columnId: string, value: any) => void;
  onAddRow: () => void;
  onDeleteRow: (rowId: string) => void;
}

export function RepeatableTableQuestion({
  question,
  listTable,
  columns,
  answers,
  onChange,
  onAddRow,
  onDeleteRow
}: RepeatableTableQuestionProps) {
  // Group answers by row
  const rows = groupAnswersByRow(answers);

  // Pagination for wide tables (>5 columns)
  const [columnOffset, setColumnOffset] = useState(0);
  const visibleColumns = columns.slice(columnOffset, columnOffset + 5);

  return (
    <div className="repeatable-table">
      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>#</th>
              {visibleColumns.map(col => (
                <th key={col.id}>{col.name}</th>
              ))}
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={visibleColumns.length + 2}>
                  No rows added yet
                </td>
              </tr>
            ) : (
              rows.map((row, index) => (
                <TableRow
                  key={row.id}
                  rowNumber={index + 1}
                  row={row}
                  columns={visibleColumns}
                  onChange={(colId, value) => onChange(row.id, colId, value)}
                  onDelete={() => onDeleteRow(row.id)}
                />
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="table-actions">
        <button
          type="button"
          className="add-row-btn"
          onClick={onAddRow}
        >
          + Add a row
        </button>

        {columns.length > 5 && (
          <div className="column-navigation">
            <button onClick={() => setColumnOffset(Math.max(0, columnOffset - 5))}>
              &lt;
            </button>
            <span>{columns.length} Col.</span>
            <button onClick={() => setColumnOffset(Math.min(columns.length - 5, columnOffset + 5))}>
              &gt;
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
```

---

## 6. State Management

### 6.1 Form State (React Hook Form)

**Purpose**: Manage form values, validation, and submission

```typescript
// In SheetPage component
const form = useForm<SheetFormData>({
  defaultValues: async () => {
    const { questions, answers } = await loadSheetData(sheetId);
    return buildFormData(questions, answers);
  },
  mode: "onChange",  // Validate on change for immediate feedback
});

interface SheetFormData {
  [questionId: string]: any;  // Dynamic based on questions
}
```

**Auto-save Implementation**:
```typescript
// Hook for auto-save
function useAutoSave(sheetId: string) {
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'error'>('saved');
  const debouncedSave = useDebouncedCallback(
    async (questionId: string, value: any) => {
      setSaveStatus('saving');
      try {
        await saveAnswer(sheetId, questionId, value);
        setSaveStatus('saved');
      } catch (error) {
        setSaveStatus('error');
      }
    },
    500  // 500ms debounce
  );

  return { saveStatus, saveAnswer: debouncedSave };
}
```

### 6.2 Global State (Zustand)

**Purpose**: Share state across components without prop drilling

```typescript
// stores/sheetStore.ts
interface SheetState {
  currentSheet: Sheet | null;
  questions: Question[];
  answers: Record<string, Answer>;
  progress: number;

  // Actions
  setSheet: (sheet: Sheet) => void;
  updateAnswer: (questionId: string, answer: Answer) => void;
  calculateProgress: () => void;
}

export const useSheetStore = create<SheetState>((set, get) => ({
  currentSheet: null,
  questions: [],
  answers: {},
  progress: 0,

  setSheet: (sheet) => set({ currentSheet: sheet }),

  updateAnswer: (questionId, answer) => {
    set(state => ({
      answers: {
        ...state.answers,
        [questionId]: answer
      }
    }));
    get().calculateProgress();
  },

  calculateProgress: () => {
    const { questions, answers } = get();
    const requiredQuestions = questions.filter(q => q.required);
    const answeredRequired = requiredQuestions.filter(q => answers[q.id]);
    const progress = (answeredRequired.length / requiredQuestions.length) * 100;
    set({ progress });
  }
}));
```

---

## 7. API Layer

### 7.1 Server Actions

**File**: `app/sheets/[sheetId]/actions.ts`

```typescript
'use server';

import { createServerClient } from '@/lib/supabase/server';

export async function loadSheetData(sheetId: string) {
  const supabase = createServerClient();

  // Load sheet with all related data
  const { data: sheet } = await supabase
    .from('sheets')
    .select(`
      *,
      sections:parent_section_id (
        *,
        subsections:subsections (
          *,
          questions:questions (
            *,
            choices:choices (*),
            list_table:list_tables (
              *,
              columns:list_table_columns (*)
            )
          )
        )
      )
    `)
    .eq('id', sheetId)
    .single();

  // Load all existing answers for this sheet
  const { data: answers } = await supabase
    .from('answers')
    .select('*')
    .eq('sheet_id', sheetId);

  return {
    sheet,
    answers
  };
}

export async function saveAnswer(
  sheetId: string,
  questionId: string,
  value: any
) {
  const supabase = createServerClient();
  const user = await supabase.auth.getUser();

  // Determine which value field to populate based on question type
  const question = await supabase
    .from('questions')
    .select('question_type')
    .eq('id', questionId)
    .single();

  const answerData = buildAnswerData(question.data.question_type, value);

  // Upsert answer (update if exists, insert if new)
  const { data, error } = await supabase
    .from('answers')
    .upsert({
      sheet_id: sheetId,
      parent_question_id: questionId,
      company_id: user.data.user?.user_metadata?.company_id,
      created_by: user.data.user?.id,
      ...answerData
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

function buildAnswerData(questionType: string, value: any) {
  switch (questionType) {
    case 'text':
      return { text_value: value };
    case 'text_area':
      return { text_area_value: value };
    case 'select_one':
      return { choice_id: value };
    case 'number':
      return { number_value: value };
    case 'date':
      return { date_value: value };
    case 'file':
      return { file_url: value };
    default:
      throw new Error(`Unknown question type: ${questionType}`);
  }
}
```

### 7.2 List Table Actions

```typescript
export async function addTableRow(
  sheetId: string,
  questionId: string,
  tableId: string
) {
  const supabase = createServerClient();

  // Create new row
  const { data: newRow } = await supabase
    .from('list_table_rows')
    .insert({
      table_id: tableId,
      row_id: Date.now()  // Use timestamp as row number
    })
    .select()
    .single();

  // Get all columns for this table
  const { data: columns } = await supabase
    .from('list_table_columns')
    .select('*')
    .eq('parent_table_id', tableId)
    .order('order_number');

  // Create empty answer for each cell
  const cellAnswers = columns.map(col => ({
    sheet_id: sheetId,
    parent_question_id: questionId,
    list_table_row_id: newRow.id,
    list_table_column_id: col.id,
    text_value: null
  }));

  await supabase
    .from('answers')
    .insert(cellAnswers);

  return newRow;
}

export async function deleteTableRow(
  sheetId: string,
  rowId: string
) {
  const supabase = createServerClient();

  // Delete all answer cells for this row
  await supabase
    .from('answers')
    .delete()
    .eq('sheet_id', sheetId)
    .eq('list_table_row_id', rowId);

  // Delete the row
  await supabase
    .from('list_table_rows')
    .delete()
    .eq('id', rowId);
}

export async function saveTableCell(
  sheetId: string,
  questionId: string,
  rowId: string,
  columnId: string,
  value: any
) {
  const supabase = createServerClient();

  // Get column type to determine value field
  const { data: column } = await supabase
    .from('list_table_columns')
    .select('response_type')
    .eq('id', columnId)
    .single();

  const valueField = getValueFieldForType(column.response_type);

  // Upsert cell answer
  await supabase
    .from('answers')
    .upsert({
      sheet_id: sheetId,
      parent_question_id: questionId,
      list_table_row_id: rowId,
      list_table_column_id: columnId,
      [valueField]: value
    });
}
```

---

## 8. UI/UX Specifications

### 8.1 Section & Subsection Navigation

The navigation system uses a collapsible accordion pattern with sections containing subsections.

#### Section Navigation Pattern
```
┌─────────────────────────────────────────────────────────────────────┐
│  ▼  1. Product Information                                          │ ← Expanded section
│      └── Subsections visible when expanded                          │
│                                                                     │
│  ►  2. Ecolabels                                                    │ ← Collapsed section
│                                                                     │
│  ►  3. Recycled Content                                             │ ← Collapsed section
│                                                                     │
│  ▼  4. Restricted Materials                                         │ ← Expanded section
│      └── 4.1 Material Declaration                                  │
│      └── 4.2 Substances of Concern                                 │
│      └── 4.3 SVHC Declaration                                      │
│      └── ...                                                       │
│                                                                     │
│  ►  5. Environmental Compliance                                     │ ← Collapsed
└─────────────────────────────────────────────────────────────────────┘
```

**Section States:**
- **Collapsed (►):** Only section title visible
- **Expanded (▼):** Section title + all subsections visible
- **Active:** Highlighted background, bold text

**Interaction:**
- Click section header to expand/collapse
- Click subsection to navigate to that question group
- Maintain expand/collapse state during session

#### Subsection UI Pattern
```
┌─────────────────────────────────────────────────────────────────────┐
│  4.8  SVHC above 0.1% declaration                                   │
│  ────────────────────────────────────────────────────────────────── │
│  ☐ Expand questions                                                 │ ← Checkbox toggle
│                                                                     │
│  ▼ 4.8.1  List any substances from the...          [👤][📎][↩][💬][ℹ]│
│                                                                     │
│  ▼ 4.8.2  Does the product contain...              [👤][📎][↩][💬][ℹ]│
│     ○ Yes                                                           │
│     ○ No                                                            │
│     ● Not assessed                                                  │
│     ○ Not applicable                                                │
│                                                                     │
│  ● 4.8.3  [Conditional question - hidden]                          │ ← Red dot = conditional
└─────────────────────────────────────────────────────────────────────┘
```

**Subsection Controls:**
- **Expand questions checkbox:** Shows/hides question detail view
- **Question list:** Collapsible individual questions
- **Action icons (right side):** User, Attachment, Undo, Comment, Info

### 8.2 Question Action Icons

Each question displays a row of action icons on the right side:

| Icon | Symbol | Purpose | Implementation |
|------|--------|---------|----------------|
| User | 👤 | View who answered / assign user | Open user assignment dialog |
| Attachment | 📎 | Add/view supporting documents | File upload modal |
| Undo | ↩️ | Revert to previous answer | History/rollback feature |
| Comment | 💬 | View/add comments on answer | Comment thread popover |
| Info | ℹ️ | View question help/guidance | Tooltip or side panel |

**Icon Bar Implementation:**
```typescript
interface QuestionActionsProps {
  questionId: string;
  hasAttachments: boolean;
  hasComments: boolean;
  commentCount: number;
  canUndo: boolean;
  assignedUser?: User;
}

function QuestionActions({ questionId, ... }: QuestionActionsProps) {
  return (
    <div className="flex items-center gap-1">
      <IconButton icon={<UserIcon />} badge={assignedUser?.initials} />
      <IconButton icon={<PaperClipIcon />} active={hasAttachments} />
      <IconButton icon={<UndoIcon />} disabled={!canUndo} />
      <IconButton icon={<ChatIcon />} badge={commentCount} />
      <IconButton icon={<InfoIcon />} />
    </div>
  );
}
```

### 8.3 Conditional Question Indicators

Questions with branching logic display visual indicators:

```
┌─────────────────────────────────────────────────────────────────────┐
│  ● 4.3.4  Does the product contain any substances...               │
│                                                                     │
│     ○ Yes                                                           │
│     ● No                                                            │
│     ○ Not assessed                                                  │
│                                                                     │
│     View related questions                                         │ ← Link to child questions
│     Next question: If yes, select which hazards...                 │ ← Preview of branch
└─────────────────────────────────────────────────────────────────────┘
```

**Conditional Indicators:**
- **Red dot (●)** before question number: Question has conditional children
- **"View related questions"** link: Navigate to dependent questions
- **"Next question: If [condition]..."**: Shows what appears based on answer
- **"Branching logic"** label: Displayed above conditional child questions

**Implementation:**
```typescript
interface ConditionalIndicatorProps {
  hasConditionalChildren: boolean;
  conditionalChildQuestions: Question[];
  triggerChoiceContent: string;  // e.g., "yes" or "no"
}

function ConditionalIndicator({
  hasConditionalChildren,
  conditionalChildQuestions,
  triggerChoiceContent
}: ConditionalIndicatorProps) {
  if (!hasConditionalChildren) return null;

  return (
    <div className="conditional-info">
      <span className="text-red-500">●</span>
      <button className="text-blue-600 underline">
        View related questions
      </button>
      <p className="text-sm text-gray-500">
        Next question: If {triggerChoiceContent}, {conditionalChildQuestions[0]?.content}...
      </p>
    </div>
  );
}
```

### 8.4 Locked Answer State

Previously submitted answers can be locked to prevent accidental changes:

```
┌─────────────────────────────────────────────────────────────────────┐
│  5.1.5  Does the product comply with...                            │
│                                                                     │
│     ○ Yes                                                           │
│     ● No                          ← Locked selection               │
│                                                                     │
│     🔒 Unlock answer                                               │ ← Click to enable edit
└─────────────────────────────────────────────────────────────────────┘
```

**Locked State Behavior:**
- All form inputs disabled (grayed out)
- Lock icon with "Unlock answer" link displayed
- Click unlock to enable editing
- Audit log tracks unlock/re-lock events

### 8.5 Add Note Feature

Each question supports optional notes/comments:

```
┌─────────────────────────────────────────────────────────────────────┐
│  + Add note                                                        │ ← Collapsed state (link)
└─────────────────────────────────────────────────────────────────────┘

                              ↓ (when expanded)

┌─────────────────────────────────────────────────────────────────────┐
│  Additional comments/ information                                   │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  Type here...                                                │   │
│  │                                                              │   │
│  │                                                              │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                            [Save]   │
└─────────────────────────────────────────────────────────────────────┘
```

**Note Component States:**
- **Collapsed:** Shows "+ Add note" link
- **Expanded:** Shows text area with label and save button
- **With Content:** Shows saved note text, edit option

### 8.6 Visual Design System

#### Colors
```css
/* Based on Bubble.io screenshots */
--primary: #2D7A4F;        /* Green for action buttons */
--primary-hover: #236440;  /* Green hover state */
--bg-gray: #F5F5F5;        /* Question background */
--bg-section: #FFFFFF;     /* Section header background */
--border: #D1D5DB;         /* Borders */
--border-focus: #2D7A4F;   /* Focus state border */
--text-primary: #1F2937;   /* Main text */
--text-secondary: #6B7280; /* Help text */
--text-link: #2563EB;      /* Links */
--error: #DC2626;          /* Error state */
--conditional: #DC2626;    /* Red dot for conditional questions */
--locked-bg: #F9FAFB;      /* Locked answer background */
```

#### Typography
```css
--font-question: 14px, system-ui;
--font-help: 12px, system-ui;
--font-heading: 16px, system-ui, weight: 600;
--font-section: 15px, system-ui, weight: 500;
```

#### Spacing
- Question padding: 24px
- Section gap: 16px
- Input height: 40px
- Button height: 36px
- Icon button size: 32px

### 8.7 Question Layout Pattern

```
┌─────────────────────────────────────────────────────────┐
│ ▼ 5.1.5  Does the product contain substances...        │ ← Collapsible
│         (Use LIST I & LIST III on https://...)         │ ← Help text
│                                                         │
│  ○ Yes.                                                │
│  ○ No, not present above the limit.                    │
│  ● Not intentionally added and reasonably not...       │ ← Selected
│  ○ Not evaluated                                       │
│                                                         │
│  + Add note                                            │ ← Optional note
│                                                         │
│  [Icons: 👤 📎 ↩️ 💬 ℹ️]                              │ ← Action icons
└─────────────────────────────────────────────────────────┘
```

### 8.8 Repeatable Table Layout

```
┌─────────────────────────────────────────────────────────┐
│ Branching logic                                          │
│                                                          │
│  ┌────┬─────────────┬────────────┬───────────┬─────┐  │
│  │ #  │ Chemical    │ CAS Number │ EC Number │ Conc│  │
│  │    │ name        │            │           │     │  │
│  ├────┼─────────────┼────────────┼───────────┼─────┤  │
│  │ 1  │ [input]     │ [input]    │ [input]   │[inp]│🗑 │
│  │ 2  │ [input]     │ [input]    │ [input]   │[inp]│🗑 │
│  └────┴─────────────┴────────────┴───────────┴─────┘  │
│                                                          │
│  [+ Add a row]                                 < 4Col. >│
│                                                          │
│  + Add note                                             │
└─────────────────────────────────────────────────────────┘
```

**Table Column Navigation:**
When tables have more columns than can be displayed, a column pagination control appears:

```
┌─────────────────────────────────────────────────────────┐
│                                           < 2Col. >     │ ← Shows current position
└─────────────────────────────────────────────────────────┘
```

- **< >** arrows: Navigate between column groups
- **"2Col."** text: Indicates current column position (e.g., columns 2-4 of 7)
- Typically shows 4-5 columns at a time on desktop
- Mobile shows 2-3 columns

**Reference Tables (Read-Only):**
Some tables display reference data (like PIDSL lists) with:
- Row counter badge showing total rows (e.g., "337")
- Read-only cells (no edit capability)
- Search/filter functionality
- Different styling from editable tables

### 8.9 Interaction Patterns

#### Auto-save Indicator
```
Top right corner:
┌─────────────────┐
│ ✓ Saved 2s ago  │  ← Success state
│ ⟳ Saving...     │  ← In progress
│ ⚠ Failed to save│  ← Error state
└─────────────────┘
```

#### Progress Indicator
```
┌─────────────────────────────────────────┐
│ Section 5: Environmental Compliance      │
│ ████████████░░░░░░░░░░░░░░░░░░░  45%    │
│ 12 of 27 questions answered              │
└─────────────────────────────────────────┘
```

#### Validation Errors
```
┌─────────────────────────────────────────┐
│  Product Name *                          │
│  ┌─────────────────────────────────────┐│
│  │                                     ││ ← Red border
│  └─────────────────────────────────────┘│
│  ⚠ This field is required               │ ← Error message
└─────────────────────────────────────────┘
```

---

## 9. Technical Implementation Details

### 9.1 File Structure

```
stacks/web/
├── app/
│   ├── sheets/
│   │   └── [sheetId]/
│   │       ├── page.tsx                 # Sheet overview
│   │       ├── actions.ts               # Server actions
│   │       ├── section/
│   │       │   └── [sectionId]/
│   │       │       └── page.tsx         # Section view
│   │       └── components/
│   │           ├── SheetHeader.tsx
│   │           ├── SectionNavigation.tsx
│   │           └── ProgressIndicator.tsx
│   └── api/
│       └── sheets/
│           └── [sheetId]/
│               └── autosave/
│                   └── route.ts          # API endpoint for auto-save
│
├── components/
│   └── sheet/
│       ├── QuestionRenderer.tsx          # Main question router
│       ├── TextInputQuestion.tsx
│       ├── TextAreaQuestion.tsx
│       ├── RadioButtonQuestion.tsx
│       ├── DropdownQuestion.tsx
│       ├── RepeatableTableQuestion.tsx
│       │   ├── TableRow.tsx
│       │   ├── TableCell.tsx
│       │   └── ColumnNavigation.tsx
│       ├── ConditionalWrapper.tsx        # Handles visibility logic
│       └── AddNoteButton.tsx
│
├── lib/
│   ├── supabase/
│   │   ├── client.ts
│   │   └── server.ts
│   ├── hooks/
│   │   ├── useAutoSave.ts
│   │   ├── useConditionalVisibility.ts
│   │   └── useSheetForm.ts
│   └── utils/
│       ├── questionHelpers.ts
│       ├── answerHelpers.ts
│       └── validationRules.ts
│
├── stores/
│   └── sheetStore.ts                     # Zustand store
│
└── types/
    ├── database.ts                       # Generated from Supabase
    ├── sheet.ts                          # Sheet-specific types
    └── question.ts                       # Question-specific types
```

### 9.2 Database Queries

#### Optimized Sheet Loading Query
```sql
-- Load entire sheet structure with one query
SELECT
  s.*,
  json_agg(
    DISTINCT jsonb_build_object(
      'id', sec.id,
      'name', sec.name,
      'order_number', sec.order_number,
      'subsections', (
        SELECT json_agg(
          DISTINCT jsonb_build_object(
            'id', sub.id,
            'name', sub.name,
            'order_number', sub.order_number,
            'questions', (
              SELECT json_agg(
                jsonb_build_object(
                  'id', q.id,
                  'content', q.content,
                  'question_type', q.question_type,
                  'required', q.required,
                  'parent_choice_id', q.parent_choice_id,
                  'choices', (
                    SELECT json_agg(c.* ORDER BY c.order_number)
                    FROM choices c
                    WHERE c.parent_question_id = q.id
                  ),
                  'list_table', (
                    SELECT jsonb_build_object(
                      'id', lt.id,
                      'name', lt.name,
                      'columns', (
                        SELECT json_agg(ltc.* ORDER BY ltc.order_number)
                        FROM list_table_columns ltc
                        WHERE ltc.parent_table_id = lt.id
                      )
                    )
                    FROM list_tables lt
                    WHERE lt.id = q.list_table_id
                  )
                ) ORDER BY q.order_number
              )
              FROM questions q
              WHERE q.parent_subsection_id = sub.id
            )
          ) ORDER BY sub.order_number
        )
        FROM subsections sub
        WHERE sub.section_id = sec.id
      )
    ) ORDER BY sec.order_number
  ) as sections
FROM sheets s
LEFT JOIN sections sec ON sec.id IN (
  SELECT DISTINCT parent_section_id
  FROM questions
  WHERE parent_section_id IS NOT NULL
)
WHERE s.id = $1
GROUP BY s.id;
```

#### Load Answers Efficiently
```sql
-- Load all answers for a sheet, grouped for easy access
SELECT
  a.*,
  q.question_type,
  c.content as choice_text,
  ltr.row_id as table_row_number,
  ltc.name as table_column_name
FROM answers a
LEFT JOIN questions q ON q.id = a.parent_question_id
LEFT JOIN choices c ON c.id = a.choice_id
LEFT JOIN list_table_rows ltr ON ltr.id = a.list_table_row_id
LEFT JOIN list_table_columns ltc ON ltc.id = a.list_table_column_id
WHERE a.sheet_id = $1
ORDER BY a.created_at ASC;
```

### 9.3 Performance Optimizations

#### 1. Data Prefetching
```typescript
// In page.tsx - prefetch data before rendering
export async function generateMetadata({ params }: { params: { sheetId: string } }) {
  // This runs before page render, caches data
  const sheet = await loadSheetData(params.sheetId);
  return {
    title: sheet.name,
  };
}
```

#### 2. Virtual Scrolling for Long Forms
```typescript
// Use react-window for long question lists
import { FixedSizeList } from 'react-window';

function QuestionList({ questions }: { questions: Question[] }) {
  return (
    <FixedSizeList
      height={600}
      itemCount={questions.length}
      itemSize={120}
      width="100%"
    >
      {({ index, style }) => (
        <div style={style}>
          <QuestionRenderer question={questions[index]} />
        </div>
      )}
    </FixedSizeList>
  );
}
```

#### 3. Debounced Auto-save
```typescript
import { useDebouncedCallback } from 'use-debounce';

function useAutoSave(sheetId: string) {
  const debouncedSave = useDebouncedCallback(
    async (questionId: string, value: any) => {
      await saveAnswer(sheetId, questionId, value);
    },
    500  // Wait 500ms after last keystroke
  );

  return debouncedSave;
}
```

#### 4. Optimistic UI Updates
```typescript
function QuestionInput({ questionId, initialValue }: Props) {
  const [value, setValue] = useState(initialValue);
  const { saveAnswer } = useAutoSave();

  const handleChange = (newValue: string) => {
    // Update UI immediately
    setValue(newValue);

    // Save in background
    saveAnswer(questionId, newValue);
  };

  return <input value={value} onChange={e => handleChange(e.target.value)} />;
}
```

---

## 10. Performance Considerations

### 10.1 Target Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Initial Page Load | < 2 seconds | Time to Interactive (TTI) |
| Auto-save Response | < 500ms | User input to save confirmation |
| Section Navigation | < 300ms | Click to render |
| Table Row Add | < 200ms | Button click to new row visible |
| Form Validation | < 100ms | Input change to error display |

### 10.2 Caching Strategy

```typescript
// Use React Query for server state caching
import { useQuery } from '@tanstack/react-query';

function useSheetData(sheetId: string) {
  return useQuery({
    queryKey: ['sheet', sheetId],
    queryFn: () => loadSheetData(sheetId),
    staleTime: 5 * 60 * 1000,  // Consider data fresh for 5 minutes
    cacheTime: 30 * 60 * 1000, // Keep in cache for 30 minutes
  });
}
```

### 10.3 Bundle Size Optimization

```javascript
// next.config.js
module.exports = {
  // Enable code splitting
  experimental: {
    optimizePackageImports: ['@supabase/supabase-js'],
  },

  // Compress output
  compress: true,

  // Analyze bundle (run with ANALYZE=true)
  webpack: (config, { isServer }) => {
    if (process.env.ANALYZE === 'true') {
      const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');
      config.plugins.push(
        new BundleAnalyzerPlugin({
          analyzerMode: 'static',
          reportFilename: isServer ? '../analyze/server.html' : './analyze/client.html',
        })
      );
    }
    return config;
  },
};
```

---

## 11. Error Handling

### 11.1 Error States

```typescript
type ErrorState =
  | { type: 'loading' }
  | { type: 'network_error', message: string }
  | { type: 'validation_error', field: string, message: string }
  | { type: 'permission_error', message: string }
  | { type: 'not_found' }
  | { type: 'success' };
```

### 11.2 Error Boundaries

```typescript
// components/ErrorBoundary.tsx
export class SheetErrorBoundary extends React.Component<Props, State> {
  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log to error reporting service
    console.error('Sheet error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-state">
          <h2>Something went wrong loading this sheet</h2>
          <button onClick={() => window.location.reload()}>
            Reload Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
```

---

## 12. Testing Strategy

### 12.1 Unit Tests

```typescript
// __tests__/components/QuestionRenderer.test.tsx
describe('QuestionRenderer', () => {
  it('renders text input for text question type', () => {
    const question = createMockQuestion({ question_type: 'text' });
    render(<QuestionRenderer question={question} />);
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  it('renders radio buttons for select_one with <=5 choices', () => {
    const question = createMockQuestion({
      question_type: 'select_one',
      choices: createMockChoices(4)
    });
    render(<QuestionRenderer question={question} />);
    expect(screen.getAllByRole('radio')).toHaveLength(4);
  });

  it('hides conditional questions when parent not answered', () => {
    const parent = createMockQuestion({ id: 'parent' });
    const child = createMockQuestion({
      id: 'child',
      parent_choice_id: 'yes-choice'
    });

    render(<QuestionRenderer question={child} />);
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  });
});
```

### 12.2 Integration Tests

```typescript
// __tests__/integration/sheet-workflow.test.tsx
describe('Sheet Workflow', () => {
  it('allows user to answer questions and auto-saves', async () => {
    const { user } = renderWithAuth(<SheetPage sheetId="test-sheet" />);

    // Answer first question
    const input = screen.getByLabelText('Product Name');
    await user.type(input, 'Test Product');

    // Wait for auto-save
    await waitFor(() => {
      expect(screen.getByText('Saved')).toBeInTheDocument();
    });

    // Verify saved to database
    const answer = await getAnswer('test-sheet', 'product-name-question');
    expect(answer.text_value).toBe('Test Product');
  });
});
```

---

## 13. Deployment & Rollout

### 13.1 Phased Rollout Plan

| Phase | Scope | Users | Success Criteria |
|-------|-------|-------|------------------|
| Phase 1: Alpha | Internal testing | 5 internal users | All question types render correctly |
| Phase 2: Beta | Pilot customers | 20 friendly customers | 90% feature parity, <5% error rate |
| Phase 3: GA | All users | All active users | Performance targets met, positive feedback |

### 13.2 Feature Flags

```typescript
// lib/featureFlags.ts
export const FEATURES = {
  NEW_SHEET_UI: process.env.NEXT_PUBLIC_ENABLE_NEW_SHEET_UI === 'true',
  AUTO_SAVE: process.env.NEXT_PUBLIC_ENABLE_AUTO_SAVE === 'true',
  REPEATABLE_TABLES: process.env.NEXT_PUBLIC_ENABLE_REPEATABLE_TABLES === 'true',
};

// In components
function SheetPage() {
  if (FEATURES.NEW_SHEET_UI) {
    return <NewSheetPage />;
  }
  return <LegacySheetPage />;
}
```

---

## 14. Future Enhancements

### 14.1 Post-MVP Features

1. **Offline Support**: Use Service Workers to enable offline answer editing
2. **Collaborative Editing**: Real-time collaboration with Supabase Realtime
3. **Answer History**: Track changes to answers over time
4. **Advanced Validation**: Custom validation rules per question
5. **AI-Assisted Completion**: Suggest answers based on previous responses
6. **Mobile App**: Native mobile experience for on-the-go answering
7. **Export to PDF**: Generate professional PDF reports from answers
8. **Answer Templates**: Pre-fill common answer patterns

### 14.2 Technical Debt Items

- Migrate from Server Actions to tRPC for better type safety
- Implement proper error tracking with Sentry
- Add comprehensive E2E tests with Playwright
- Set up performance monitoring with Vercel Analytics
- Create component documentation with Storybook

---

## Appendix A: Type Definitions

```typescript
// types/sheet.ts
export interface Sheet {
  id: string;
  name: string;
  company_id: string;
  assigned_to_company_id: string;
  status: 'draft' | 'in_progress' | 'submitted' | 'approved';
  created_at: Date;
  modified_at: Date;
}

export interface Section {
  id: string;
  name: string;
  order_number: number;
  subsections: Subsection[];
}

export interface Subsection {
  id: string;
  name: string;
  order_number: number;
  questions: Question[];
}

export interface Question {
  id: string;
  content: string;
  question_type: QuestionType;
  question_description?: string;
  required: boolean;
  order_number: number;
  parent_choice_id?: string;
  clarification?: string;
  clarification_yes_no: boolean;
  support_file_requested: boolean;

  // Relations
  choices?: Choice[];
  list_table?: ListTableWithColumns;
}

export type QuestionType =
  | 'text'
  | 'text_area'
  | 'number'
  | 'date'
  | 'select_one'
  | 'select_multiple'
  | 'file'
  | 'list_table';

export interface Choice {
  id: string;
  content: string;
  order_number: number;
  parent_question_id: string;
}

export interface ListTableWithColumns {
  id: string;
  name: string;
  columns: ListTableColumn[];
}

export interface Answer {
  id: string;
  sheet_id: string;
  parent_question_id: string;
  company_id: string;

  // Value fields
  text_value?: string;
  text_area_value?: string;
  number_value?: number;
  boolean_value?: boolean;
  date_value?: Date;
  choice_id?: string;
  file_url?: string;

  // List table fields
  list_table_row_id?: string;
  list_table_column_id?: string;

  created_at: Date;
  modified_at: Date;
}
```

---

**End of Technical Specification**
