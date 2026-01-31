'use client'

import { useState, useEffect, useCallback } from 'react'
import { AppLayout } from '@/components/layout/app-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plus, ArrowLeft, Loader2, HelpCircle } from 'lucide-react'
import Link from 'next/link'
import { CustomQuestionList } from '@/components/settings/custom-question-list'
import { CustomQuestionForm } from '@/components/settings/custom-question-form'

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

export default function CustomQuestionsPage() {
  const [questions, setQuestions] = useState<CompanyQuestion[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [editingQuestion, setEditingQuestion] = useState<CompanyQuestion | null>(null)

  const loadQuestions = useCallback(async () => {
    try {
      setError(null)
      const response = await fetch('/api/company-questions')
      if (!response.ok) {
        throw new Error('Failed to load questions')
      }
      const data = await response.json()
      setQuestions(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load questions')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadQuestions()
  }, [loadQuestions])

  const handleEdit = (question: CompanyQuestion) => {
    setEditingQuestion(question)
    setFormOpen(true)
  }

  const handleAddNew = () => {
    setEditingQuestion(null)
    setFormOpen(true)
  }

  const handleSaved = () => {
    loadQuestions()
  }

  return (
    <AppLayout title="Custom Questions">
      <div className="space-y-6 max-w-4xl">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/settings">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-semibold">Custom Questions</h1>
              <p className="text-muted-foreground mt-1">
                Create custom questions to include in supplier requests
              </p>
            </div>
          </div>
          <Button onClick={handleAddNew}>
            <Plus className="h-4 w-4 mr-2" />
            Add Question
          </Button>
        </div>

        {/* Info Card */}
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="py-4">
            <div className="flex gap-3">
              <HelpCircle className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
              <div className="text-sm text-blue-900">
                <p className="font-medium">How custom questions work</p>
                <p className="mt-1 text-blue-700">
                  Custom questions appear in an "Additional Questions" section when you send
                  a request to a supplier. You can select which questions to include in each
                  request. Suppliers will see these questions alongside the standard questionnaire.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Questions Card */}
        <Card>
          <CardHeader>
            <CardTitle>Your Questions</CardTitle>
            <CardDescription>
              {questions.length === 0
                ? 'No questions created yet'
                : `${questions.length} custom question${questions.length === 1 ? '' : 's'}`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : error ? (
              <div className="text-center py-8 text-red-600">
                <p>{error}</p>
                <Button variant="outline" onClick={loadQuestions} className="mt-4">
                  Try Again
                </Button>
              </div>
            ) : (
              <CustomQuestionList
                questions={questions}
                onEdit={handleEdit}
                onDeleted={handleSaved}
              />
            )}
          </CardContent>
        </Card>
      </div>

      <CustomQuestionForm
        open={formOpen}
        onOpenChange={setFormOpen}
        question={editingQuestion}
        onSaved={handleSaved}
      />
    </AppLayout>
  )
}
