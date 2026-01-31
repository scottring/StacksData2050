'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { MoreVertical, Pencil, Trash2, Type, ToggleLeft, ListOrdered } from 'lucide-react'

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

interface CustomQuestionListProps {
  questions: CompanyQuestion[]
  onEdit: (question: CompanyQuestion) => void
  onDeleted: () => void
}

const responseTypeLabels = {
  text: { label: 'Text', icon: Type },
  yes_no: { label: 'Yes/No', icon: ToggleLeft },
  choice: { label: 'Dropdown', icon: ListOrdered },
}

export function CustomQuestionList({
  questions,
  onEdit,
  onDeleted,
}: CustomQuestionListProps) {
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  const handleDelete = async () => {
    if (!deleteId) return

    setDeleting(true)
    try {
      const response = await fetch(`/api/company-questions/${deleteId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to delete question')
      }

      onDeleted()
    } catch (error) {
      console.error('Error deleting question:', error)
    } finally {
      setDeleting(false)
      setDeleteId(null)
    }
  }

  if (questions.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>No custom questions yet.</p>
        <p className="text-sm mt-1">Add your first question to get started.</p>
      </div>
    )
  }

  return (
    <>
      <div className="divide-y border rounded-md">
        {questions.map((question, index) => {
          const TypeIcon = responseTypeLabels[question.response_type].icon
          return (
            <div
              key={question.id}
              className="p-4 flex items-start justify-between gap-4 hover:bg-muted/50"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-muted-foreground">
                    {index + 1}.
                  </span>
                  <p className="font-medium truncate">{question.question_text}</p>
                </div>
                <div className="flex items-center gap-2 mt-1.5">
                  <Badge variant="secondary" className="text-xs">
                    <TypeIcon className="h-3 w-3 mr-1" />
                    {responseTypeLabels[question.response_type].label}
                  </Badge>
                  {question.required && (
                    <Badge variant="outline" className="text-xs">
                      Required
                    </Badge>
                  )}
                  {question.response_type === 'choice' && question.choices && (
                    <span className="text-xs text-muted-foreground">
                      {question.choices.length} options
                    </span>
                  )}
                </div>
                {question.hint && (
                  <p className="text-sm text-muted-foreground mt-1.5 line-clamp-1">
                    Hint: {question.hint}
                  </p>
                )}
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => onEdit(question)}>
                    <Pencil className="h-4 w-4 mr-2" />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => setDeleteId(question.id)}
                    className="text-red-600 focus:text-red-600"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )
        })}
      </div>

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Custom Question</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this question? This will remove it from
              future requests, but existing answers will be preserved.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
