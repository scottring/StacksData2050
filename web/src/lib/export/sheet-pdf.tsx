import React from 'react'
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'
import type { SheetDocument, SheetDocumentQuestion } from './sheet-document'

const styles = StyleSheet.create({
  page: { paddingTop: 48, paddingBottom: 56, paddingHorizontal: 48, fontFamily: 'Helvetica', fontSize: 9.5, color: '#1f2937' },
  title: { fontSize: 18, fontFamily: 'Helvetica-Bold', marginBottom: 2 },
  subtitle: { fontSize: 10, color: '#6b7280', marginBottom: 14 },
  metaGrid: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 18, borderWidth: 0.5, borderColor: '#e5e7eb', borderRadius: 4, padding: 8 },
  metaItem: { width: '50%', marginBottom: 3 },
  metaLabel: { fontSize: 7.5, color: '#6b7280', textTransform: 'uppercase' },
  metaValue: { fontSize: 9.5 },
  section: { marginTop: 14, marginBottom: 6 },
  sectionTitle: { fontSize: 13, fontFamily: 'Helvetica-Bold', color: '#065f46', paddingBottom: 3, borderBottomWidth: 1, borderBottomColor: '#065f46' },
  subsectionTitle: { fontSize: 10.5, fontFamily: 'Helvetica-Bold', color: '#374151', marginTop: 10, marginBottom: 4 },
  question: { marginBottom: 7, paddingBottom: 6, borderBottomWidth: 0.5, borderBottomColor: '#e5e7eb' },
  qRow: { flexDirection: 'row' },
  qNumber: { width: 44, fontSize: 8, fontFamily: 'Helvetica-Bold', color: '#6b7280', paddingTop: 1 },
  qBody: { flex: 1 },
  qText: { fontSize: 9.5, marginBottom: 2 },
  answer: { fontSize: 9.5, fontFamily: 'Helvetica-Bold', color: '#111827' },
  noAnswer: { fontSize: 9, color: '#9ca3af' },
  notes: { fontSize: 8.5, color: '#4b5563', marginTop: 2 },
  attachments: { fontSize: 8.5, color: '#4b5563', marginTop: 2 },
  table: { marginTop: 4, borderWidth: 0.5, borderColor: '#d1d5db' },
  tableHeader: { flexDirection: 'row', backgroundColor: '#f3f4f6', borderBottomWidth: 0.5, borderBottomColor: '#d1d5db' },
  tableRow: { flexDirection: 'row', borderBottomWidth: 0.5, borderBottomColor: '#e5e7eb' },
  cell: { paddingVertical: 3, paddingHorizontal: 4, fontSize: 8.5 },
  cellHeader: { paddingVertical: 3, paddingHorizontal: 4, fontSize: 8.5, fontFamily: 'Helvetica-Bold' },
  footer: { position: 'absolute', bottom: 24, left: 48, right: 48, flexDirection: 'row', justifyContent: 'space-between', fontSize: 7.5, color: '#9ca3af' },
})

function formatDate(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toISOString().slice(0, 10)
}

function statusLabel(status: string): string {
  return status.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

/**
 * List-table columns carry no width metadata (list_table_columns stores only
 * name and order), so column widths are derived from content at render time.
 * Equal-width columns wreck these tables: an empty "E-no" column takes the
 * same space as an "SML (mg/kg)" column whose values wrap to five lines, and
 * headers hyphenate mid-word ("CAS Num-ber, if any").
 */
const COL_MAX_PCT = 26
const CELL_PADDING = 8

/** Rough Helvetica advance width per character. Digits and caps run wider than
 *  lowercase, so CAS numbers ("25322-68-3") need the pessimistic figure. */
function textWidth(s: string, fontSize: number): number {
  return s.length * fontSize * 0.56
}

/** Longest run that cannot be broken across lines. @react-pdf does not break on
 *  hyphens, so "25322-68-3" is one atom and must fit or it overflows the cell. */
function longestAtom(s: string): string {
  return s.split(/\s+/).reduce((m, w) => (w.length > m.length ? w : m), '')
}

function columnWidths(columns: string[], rows: string[][], fontSize: number, tableWidth: number): string[] {
  const cellsOf = (i: number) => rows.map(r => r[i] || '')

  // Desired width: the 90th-percentile cell, so one outlier doesn't starve the
  // rest, with the header pulling a little but never dominating.
  const desired = columns.map((col, i) => {
    const lens = cellsOf(i).map(c => c.length).sort((a, b) => a - b)
    const p90 = lens.length > 0 ? lens[Math.min(lens.length - 1, Math.floor(lens.length * 0.9))] : 0
    return Math.max(textWidth(col.slice(0, 16), fontSize) * 0.6, textWidth('x'.repeat(p90), fontSize), 1)
  })

  // Hard floor: the widest unbreakable token in the column, header or cell.
  // Capped so one pathological value can't consume the whole row.
  const floors = columns.map((col, i) => {
    const atoms = [longestAtom(col), ...cellsOf(i).map(longestAtom)]
    const widest = atoms.reduce((m, a) => Math.max(m, textWidth(a, fontSize)), 0)
    return Math.min(widest + CELL_PADDING, tableWidth * 0.3)
  })

  const total = desired.reduce((a, b) => a + b, 0)
  const desiredPct = desired.map(w => Math.min(COL_MAX_PCT, (w / total) * 100))
  const floorPct = floors.map(f => (f / tableWidth) * 100)
  const floorSum = floorPct.reduce((a, b) => a + b, 0)

  // Everything is already at its minimum: nothing left to distribute.
  if (floorSum >= 100) {
    return floorPct.map(w => `${((w / floorSum) * 100).toFixed(3)}%`)
  }

  // Give every column its floor, then hand out the slack in proportion to how
  // much more each one wanted. Rescaling instead would push floored columns
  // back under their minimum and reintroduce the overflow.
  const slack = 100 - floorSum
  const wants = desiredPct.map((d, i) => Math.max(0, d - floorPct[i]))
  const wantSum = wants.reduce((a, b) => a + b, 0)

  return floorPct.map((f, i) => {
    const share = wantSum > 0 ? (wants[i] / wantSum) * slack : slack / columns.length
    return `${(f + share).toFixed(3)}%`
  })
}

/** Width of the question-number gutter, reclaimed by wide tables. */
const GUTTER = 44
/** A4 width less the page's horizontal padding (48pt each side). */
const CONTENT_WIDTH = 595.28 - 48 * 2
/** Above this column count a table needs more room than the text column has. */
const WIDE_TABLE_COLS = 6
/** Above this, cells also step down a point to stay on one line. */
const DENSE_TABLE_COLS = 8
/** Above this many rows, let the table break across pages instead of clipping. */
const WRAPPING_TABLE_ROWS = 8

function ListTable({ table }: { table: NonNullable<SheetDocumentQuestion['table']> }) {
  const wide = table.columns.length >= WIDE_TABLE_COLS
  const dense = table.columns.length >= DENSE_TABLE_COLS
  const cellSize = dense ? { fontSize: 7.5 } : undefined
  const fontSize = dense ? 7.5 : 8.5
  const width = (wide ? CONTENT_WIDTH : CONTENT_WIDTH - GUTTER) - 1
  const widths = columnWidths(table.columns, table.rows, fontSize, width)

  return (
    <View style={[styles.table, wide ? { marginLeft: -GUTTER } : {}]}>
      {/* `fixed` repeats the header when the table breaks across pages. */}
      <View style={styles.tableHeader} fixed>
        {table.columns.map((c, i) => (
          <Text key={i} style={[styles.cellHeader, { width: widths[i] }, cellSize || {}]}>{c}</Text>
        ))}
      </View>
      {table.rows.map((row, ri) => (
        <View key={ri} style={styles.tableRow} wrap={false}>
          {table.columns.map((_, ci) => (
            <Text key={ci} style={[styles.cell, { width: widths[ci] }, cellSize || {}]}>{row[ci] || ''}</Text>
          ))}
        </View>
      ))}
    </View>
  )
}

function QuestionBlock({ q }: { q: SheetDocumentQuestion }) {
  // Prose questions should never split. A long table has to, or it gets clipped.
  const allowWrap = !!q.table && q.table.rows.length > WRAPPING_TABLE_ROWS
  return (
    <View style={styles.question} wrap={allowWrap}>
      <View style={styles.qRow}>
        <Text style={styles.qNumber}>{q.number}</Text>
        <View style={styles.qBody}>
          <Text style={styles.qText}>{q.text}</Text>
          {q.table ? (
            q.table.rows.length === 0 ? (
              <Text style={styles.noAnswer}>No entries</Text>
            ) : (
              <ListTable table={q.table} />
            )
          ) : q.answer ? (
            <Text style={styles.answer}>{q.answer}</Text>
          ) : (
            <Text style={styles.noAnswer}>No answer</Text>
          )}
          {q.additionalNotes ? <Text style={styles.notes}>Notes: {q.additionalNotes}</Text> : null}
          {q.attachments.length > 0 ? (
            <Text style={styles.attachments}>Attachments: {q.attachments.join(', ')}</Text>
          ) : null}
        </View>
      </View>
    </View>
  )
}

export function SheetPdfDocument({ doc }: { doc: SheetDocument }) {
  const generated = formatDate(doc.generatedAt)
  return (
    <Document title={doc.sheet.name} author="StacksData" subject="Supplier questionnaire response">
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>{doc.sheet.name}</Text>
        <Text style={styles.subtitle}>Supplier questionnaire response</Text>

        <View style={styles.metaGrid}>
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>Supplier</Text>
            <Text style={styles.metaValue}>{doc.supplier}</Text>
          </View>
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>Customer</Text>
            <Text style={styles.metaValue}>{doc.customer || '-'}</Text>
          </View>
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>Status</Text>
            <Text style={styles.metaValue}>{statusLabel(doc.sheet.status)}</Text>
          </View>
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>Version</Text>
            <Text style={styles.metaValue}>{String(doc.sheet.version)}</Text>
          </View>
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>Questionnaire</Text>
            <Text style={styles.metaValue}>{doc.tags.length > 0 ? doc.tags.join(', ') : '-'}</Text>
          </View>
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>{doc.sheet.submittedAt ? 'Submitted' : 'Last modified'}</Text>
            <Text style={styles.metaValue}>{formatDate(doc.sheet.submittedAt || doc.sheet.modifiedAt) || '-'}</Text>
          </View>
        </View>

        {doc.sections.map(section => (
          <View key={section.number}>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{section.number}  {section.name}</Text>
            </View>
            {section.subsections.map(sub => (
              <View key={sub.number}>
                <Text style={styles.subsectionTitle} minPresenceAhead={40}>{sub.number}  {sub.name}</Text>
                {sub.questions.map(q => (
                  <QuestionBlock key={q.number + q.text} q={q} />
                ))}
              </View>
            ))}
          </View>
        ))}

        {doc.customQuestions.length > 0 ? (
          <View>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Additional questions from {doc.customer || 'the customer'}</Text>
            </View>
            {doc.customQuestions.map((cq, i) => (
              <QuestionBlock
                key={i}
                q={{ number: `C.${i + 1}`, text: cq.text, responseType: 'text', answer: cq.answer, additionalNotes: null, table: null, attachments: [] }}
              />
            ))}
          </View>
        ) : null}

        <View style={styles.footer} fixed>
          <Text>{doc.sheet.name}  ·  {doc.supplier}  ·  Generated {generated} by StacksData</Text>
          <Text render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
        </View>
      </Page>
    </Document>
  )
}
