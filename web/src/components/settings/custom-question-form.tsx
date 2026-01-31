'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Plus, X, Loader2 } from 'lucide-react'

interface CompanyQuestion {
  id: string
  company_id: string
  question_text: string
  response_type: 'text' | 'yes_no' | 'choice'
  choices: string[] | null
  hint: string | null
  required: boolean
  sort_order: number
  archived: boolean
  created_at: string
  updated_at: string
}

interface CustomQuestionFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  question?: CompanyQuestion | null
  onSaved: () => void
}

export function CustomQuestionForm({
  open,
  onOpenChange,
  question,
  onSaved,
}: CustomQuestionFormProps) {
  const [questionText, setQuestionText] = useState('')
  const [responseType, setResponseType] = useState<'text' | 'yes_no' | 'choice'>('text')
  const [choices, setChoices] = useState<string[]>(['', ''])
  const [hint, setHint] = useState('')
  const [required, setRequired] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Reset form when dialog opens/closes or question changes
  useEffect(() => {
    if (open && question) {
      setQuestionText(question.question_text)
      setResponseType(question.response_type)
      setChoices(question.choices && question.choices.length > 0 ? question.choices : ['', ''])
      setHint(question.hint || '')
      setRequired(question.required)
    } else if (open && !question) {
      setQuestionText('')
      setResponseType('text')
      setChoices(['', ''])
      setHint('')
      setRequired(false)
    }
    setError(null)
  }, [open, question])

  const addChoice = () => {
    setChoices([...choices, ''])
  }

  const removeChoice = (index: number) => {
    if (choices.length > 2) {
      setChoices(choices.filter((_, i) => i !== index))
    }
  }

  const updateChoice = (index: number, value: string) => {
    const newChoices = [...choices]
    newChoices[index] = value
    setChoices(newChoices)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!questionText.trim()) {
      setError('Question text is required')
      return
    }

    if (responseType === 'choice') {
      const validChoices = choices.filter((c) => c.trim())
      if (validChoices.length < 2) {
        setError('At least 2 choices are required for dropdown questions')
        return
      }
    }

    setSaving(true)

    try {
      const payload = {
        question_text: questionText.trim(),
        response_type: responseType,
        choices: responseType === 'choice' ? choices.filter((c) => c.trim()) : null,
        hint: hint.trim() || null,
        required,
      }

      const url = question
        ? `/api/company-questions/${question.id}`
        : '/api/company-questions'
      const method = question ? 'PATCH' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to save question')
      }

      onSaved()
      onOpenChange(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save question')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {question ? 'Edit Custom Question' : 'Add Custom Question'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="question-text">Question *</Label>
            <Input
              id="question-text"
              placeholder="Enter your question"
              value={questionText}
              onChange={(e) => setQuestionText(e.target.value)}
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="response-type">Response Type</Label>
            <Select value={responseType} onValueChange={(v) => setResponseType(v as 'text' | 'yes_no' | 'choice')}>
              <SelectTrigger id="response-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="text">Text</SelectItem>
                <SelectItem value="yes_no">Yes / No</SelectItem>
                <SelectItem value="choice">Dropdown (Choice)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {responseType === 'choice' && (
            <div className="space-y-2">
              <Label>Choices *</Label>
              <div className="space-y-2">
                {choices.map((choice, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Input
                      placeholder={`Option ${index + 1}`}
                      value={choice}
                      onChange={(e) => updateChoice(index, e.target.value)}
                    />
                    {choices.length > 2 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeChoice(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addChoice}
                  className="w-full"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add Choice
                </Button>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="hint">Hint Text (optional)</Label>
            <Input
              id="hint"
              placeholder="Additional context or instructions for the supplier"
              value={hint}
              onChange={(e) => setHint(e.target.value)}
            />
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="required"
              checked={required}
              onCheckedChange={(checked) => setRequired(checked as boolean)}
            />
            <Label htmlFor="required" className="font-normal cursor-pointer">
              Required question
            </Label>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {question ? 'Save Changes' : 'Add Question'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
