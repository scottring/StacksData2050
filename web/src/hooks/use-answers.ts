'use client'

import { useState, useCallback, useRef } from 'react'
import { useDebouncedCallback } from 'use-debounce'

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

export interface PendingAnswer {
  question_id: string
  answer_id?: string
  value: string | number | boolean | null
  type: string
  clarification?: string
  list_table_row_id?: string
  list_table_column_id?: string
}

export interface UseAnswersOptions {
  sheetId: string
  debounceMs?: number
  onSaveError?: (error: Error) => void
  onSaveSuccess?: () => void
}

/**
 * Hook for managing answer saves with auto-save and debouncing
 */
export function useAnswers({
  sheetId,
  debounceMs = 1500,
  onSaveError,
  onSaveSuccess,
}: UseAnswersOptions) {
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
  const pendingChangesRef = useRef<Map<string, PendingAnswer>>(new Map())

  /**
   * Save all pending changes to the server
   */
  const saveChanges = useCallback(async () => {
    if (pendingChangesRef.current.size === 0) return

    setSaveStatus('saving')

    try {
      const answers = Array.from(pendingChangesRef.current.values())
      pendingChangesRef.current.clear()

      const response = await fetch('/api/answers/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sheet_id: sheetId,
          answers,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to save answers')
      }

      const result = await response.json()

      if (result.errors > 0) {
        console.warn(`Saved ${result.saved} answers with ${result.errors} errors:`, result.results)
      }

      setSaveStatus('saved')
      onSaveSuccess?.()

      // Reset to idle after showing saved state
      setTimeout(() => setSaveStatus('idle'), 3000)

    } catch (error) {
      console.error('Error saving answers:', error)
      setSaveStatus('error')
      onSaveError?.(error instanceof Error ? error : new Error('Save failed'))
    }
  }, [sheetId, onSaveError, onSaveSuccess])

  /**
   * Debounced version of save for auto-save
   */
  const debouncedSave = useDebouncedCallback(saveChanges, debounceMs)

  /**
   * Queue an answer change for saving
   */
  const queueAnswer = useCallback((
    questionId: string,
    value: string | number | boolean | null,
    type: string,
    options?: {
      answerId?: string
      clarification?: string
      listTableRowId?: string
      listTableColumnId?: string
    }
  ) => {
    const key = `${questionId}|${options?.listTableRowId || ''}|${options?.listTableColumnId || ''}`

    pendingChangesRef.current.set(key, {
      question_id: questionId,
      answer_id: options?.answerId,
      value,
      type,
      clarification: options?.clarification,
      list_table_row_id: options?.listTableRowId,
      list_table_column_id: options?.listTableColumnId,
    })

    // Trigger debounced save
    debouncedSave()
  }, [debouncedSave])

  /**
   * Save a single answer immediately (bypass debounce)
   */
  const saveAnswer = useCallback(async (
    questionId: string,
    value: string | number | boolean | null,
    type: string,
    options?: {
      answerId?: string
      clarification?: string
      listTableRowId?: string
      listTableColumnId?: string
    }
  ) => {
    setSaveStatus('saving')

    try {
      const response = await fetch('/api/answers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sheet_id: sheetId,
          question_id: questionId,
          answer_id: options?.answerId,
          value,
          type,
          clarification: options?.clarification,
          list_table_row_id: options?.listTableRowId,
          list_table_column_id: options?.listTableColumnId,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to save answer')
      }

      const result = await response.json()

      setSaveStatus('saved')
      onSaveSuccess?.()
      setTimeout(() => setSaveStatus('idle'), 3000)

      return result.answer

    } catch (error) {
      console.error('Error saving answer:', error)
      setSaveStatus('error')
      onSaveError?.(error instanceof Error ? error : new Error('Save failed'))
      throw error
    }
  }, [sheetId, onSaveError, onSaveSuccess])

  /**
   * Delete an answer
   */
  const deleteAnswer = useCallback(async (answerId: string) => {
    setSaveStatus('saving')

    try {
      const response = await fetch(`/api/answers?id=${answerId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to delete answer')
      }

      setSaveStatus('saved')
      onSaveSuccess?.()
      setTimeout(() => setSaveStatus('idle'), 3000)

    } catch (error) {
      console.error('Error deleting answer:', error)
      setSaveStatus('error')
      onSaveError?.(error instanceof Error ? error : new Error('Delete failed'))
      throw error
    }
  }, [onSaveError, onSaveSuccess])

  /**
   * Force save all pending changes immediately
   */
  const flush = useCallback(() => {
    debouncedSave.flush()
    return saveChanges()
  }, [debouncedSave, saveChanges])

  /**
   * Check if there are unsaved changes
   */
  const hasPendingChanges = pendingChangesRef.current.size > 0

  return {
    saveStatus,
    queueAnswer,
    saveAnswer,
    deleteAnswer,
    flush,
    hasPendingChanges,
  }
}
