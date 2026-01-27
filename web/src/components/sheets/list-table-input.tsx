'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Plus, Trash2 } from 'lucide-react'
import { InlineCASLookup } from './cas-lookup'

export interface ListTableRow {
  id: string
  values: Record<string, string>
}

interface ListTableInputProps {
  questionId: string
  existingRows: ListTableRow[]
  onRowsChange: (rows: ListTableRow[]) => void
  disabled?: boolean
  columns?: { key: string; label: string; choices?: string[] }[]
}

// Default columns if none specified
const DEFAULT_COLUMNS = [
  { key: 'substance', label: 'Substance/Item' },
  { key: 'details', label: 'Details/Value' }
]

export function ListTableInput({
  questionId,
  existingRows,
  onRowsChange,
  disabled = false,
  columns = DEFAULT_COLUMNS
}: ListTableInputProps) {
  const [rows, setRows] = useState<ListTableRow[]>(
    existingRows.length > 0 ? existingRows : []
  )

  // Sync rows state when existingRows changes (e.g., when data loads)
  // Use a simple heuristic: length and first row ID
  const existingRowsKey = existingRows.length > 0 ? `${existingRows.length}-${existingRows[0]?.id}` : '0'
  const currentRowsKey = rows.length > 0 ? `${rows.length}-${rows[0]?.id}` : '0'

  useEffect(() => {
    if (existingRows.length > 0 && existingRowsKey !== currentRowsKey) {
      setRows(existingRows)
    }
  }, [existingRowsKey])


  const generateId = () => `row-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

  const addRow = () => {
    const newRow: ListTableRow = {
      id: generateId(),
      values: columns.reduce((acc, col) => ({ ...acc, [col.key]: '' }), {})
    }
    const updated = [...rows, newRow]
    setRows(updated)
    onRowsChange(updated)
  }

  const removeRow = (rowId: string) => {
    const updated = rows.filter(r => r.id !== rowId)
    setRows(updated)
    onRowsChange(updated)
  }

  const updateCell = (rowId: string, columnKey: string, value: string) => {
    const updated = rows.map(row =>
      row.id === rowId
        ? { ...row, values: { ...row.values, [columnKey]: value } }
        : row
    )
    setRows(updated)
    onRowsChange(updated)
  }

  return (
    <div className="space-y-3">
      {rows.length > 0 && (
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                {columns.map(col => (
                  <th
                    key={col.key}
                    className="text-left px-3 py-2 text-sm font-medium text-muted-foreground"
                  >
                    {col.label}
                  </th>
                ))}
                <th className="w-10"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr
                  key={row.id}
                  className={index % 2 === 0 ? 'bg-background' : 'bg-muted/20'}
                >
                  {columns.map((col, colIndex) => {
                    const cellValue = row.values[col.key] || ''
                    // Use CAS lookup for CAS Number column
                    const isCASColumn = (
                      col.label.toLowerCase().includes('cas number') ||
                      col.label.toLowerCase().includes('cas registry') ||
                      col.key.toLowerCase().includes('cas')
                    )

                    return (
                    <td key={col.key} className="px-2 py-1.5">
                      {col.choices && col.choices.length > 0 ? (
                        <select
                          value={cellValue}
                          onChange={(e) => updateCell(row.id, col.key, e.target.value)}
                          disabled={disabled}
                          className="w-full h-8 text-sm rounded-md border border-input bg-background px-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <option value="">Select...</option>
                          {col.choices.map(choice => (
                            <option key={choice} value={choice}>
                              {choice}
                            </option>
                          ))}
                        </select>
                      ) : isCASColumn ? (
                        <InlineCASLookup
                          value={cellValue}
                          onChange={(value) => updateCell(row.id, col.key, value)}
                          onChemicalFound={(data) => {
                            // Auto-fill the chemical name in the first column if empty
                            const chemicalNameKey = columns[0]?.key
                            if (chemicalNameKey && !row.values[chemicalNameKey]) {
                              updateCell(row.id, chemicalNameKey, data.name)
                            }
                          }}
                        />
                      ) : (
                        <Input
                          value={cellValue}
                          onChange={(e) => updateCell(row.id, col.key, e.target.value)}
                          disabled={disabled}
                          className="h-8 text-sm"
                          placeholder={col.label}
                        />
                      )}
                    </td>
                    )
                  })}
                  <td className="px-2 py-1.5">
                    {!disabled && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={() => removeRow(row.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!disabled && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addRow}
          className="w-full"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Row
        </Button>
      )}

      {rows.length === 0 && disabled && (
        <p className="text-sm text-muted-foreground italic">No entries</p>
      )}
    </div>
  )
}
