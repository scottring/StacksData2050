'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { MessageCircle, Send, Loader2, ChevronDown, ChevronUp } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

interface Comment {
  id: string
  question_id: string
  content: string
  created_at: string
  user_id: string
  users: {
    id: string
    email: string
    first_name: string | null
    last_name: string | null
    company_id: string
    companies: {
      name: string
    } | null
  } | null
}

interface QuestionCommentsProps {
  sheetId: string
  questionId: string
  compact?: boolean
}

export function QuestionComments({ sheetId, questionId, compact = true }: QuestionCommentsProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [comments, setComments] = useState<Comment[]>([])
  const [loading, setLoading] = useState(false)
  const [newComment, setNewComment] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Fetch comments when opened
  useEffect(() => {
    if (isOpen) {
      fetchComments()
    }
  }, [isOpen, sheetId, questionId])

  const fetchComments = async () => {
    setLoading(true)
    try {
      const response = await fetch(
        `/api/comments?sheet_id=${sheetId}&question_id=${questionId}`
      )
      if (response.ok) {
        const data = await response.json()
        setComments(data)
      }
    } catch (error) {
      console.error('Failed to fetch comments:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newComment.trim() || submitting) return

    setSubmitting(true)
    try {
      const response = await fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sheet_id: sheetId,
          question_id: questionId,
          content: newComment.trim(),
        }),
      })

      if (response.ok) {
        const comment = await response.json()
        setComments(prev => [...prev, comment])
        setNewComment('')
      }
    } catch (error) {
      console.error('Failed to post comment:', error)
    } finally {
      setSubmitting(false)
    }
  }

  const commentCount = comments.length

  // Compact mode - just show the bubble button
  if (compact && !isOpen) {
    return (
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsOpen(true)}
        className="h-7 px-2 text-muted-foreground hover:text-foreground"
        title="Comments"
      >
        <MessageCircle className="h-4 w-4" />
        {commentCount > 0 && (
          <span className="ml-1 text-xs">{commentCount}</span>
        )}
      </Button>
    )
  }

  return (
    <div className="border rounded-lg bg-muted/30 mt-2">
      {/* Header */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-3 py-2 text-sm font-medium hover:bg-muted/50 transition-colors"
      >
        <span className="flex items-center gap-2">
          <MessageCircle className="h-4 w-4" />
          Comments {commentCount > 0 && `(${commentCount})`}
        </span>
        {isOpen ? (
          <ChevronUp className="h-4 w-4" />
        ) : (
          <ChevronDown className="h-4 w-4" />
        )}
      </button>

      {/* Comments thread */}
      {isOpen && (
        <div className="border-t px-3 py-2 space-y-3">
          {loading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          ) : comments.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-2">
              No comments yet
            </p>
          ) : (
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {comments.map((comment) => (
                <div key={comment.id} className="text-sm">
                  <div className="flex items-baseline gap-2">
                    <span className="font-medium">
                      {comment.users?.first_name || comment.users?.email?.split('@')[0] || 'User'}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {comment.users?.companies?.name}
                    </span>
                    <span className="text-xs text-muted-foreground ml-auto">
                      {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                    </span>
                  </div>
                  <p className="text-muted-foreground mt-0.5 whitespace-pre-wrap">
                    {comment.content}
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* New comment form */}
          <form onSubmit={handleSubmit} className="flex gap-2 pt-2 border-t">
            <input
              type="text"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Add a comment..."
              className="flex-1 h-8 px-2 text-sm rounded-md border border-input bg-background"
              disabled={submitting}
            />
            <Button
              type="submit"
              size="sm"
              disabled={!newComment.trim() || submitting}
              className="h-8"
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </form>
        </div>
      )}
    </div>
  )
}

/**
 * Inline comment button - shows just the bubble icon with count
 * Expands to full thread when clicked
 */
export function InlineCommentButton({ sheetId, questionId }: { sheetId: string, questionId: string }) {
  const [isOpen, setIsOpen] = useState(false)
  const [commentCount, setCommentCount] = useState(0)

  // Fetch comment count on mount
  useEffect(() => {
    const fetchCount = async () => {
      try {
        const response = await fetch(
          `/api/comments?sheet_id=${sheetId}&question_id=${questionId}`
        )
        if (response.ok) {
          const data = await response.json()
          setCommentCount(data.length)
        }
      } catch (error) {
        console.error('Failed to fetch comment count:', error)
      }
    }
    fetchCount()
  }, [sheetId, questionId])

  if (isOpen) {
    return (
      <QuestionComments
        sheetId={sheetId}
        questionId={questionId}
        compact={false}
      />
    )
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => setIsOpen(true)}
      className="h-7 px-2 text-muted-foreground hover:text-foreground"
      title="Comments"
    >
      <MessageCircle className="h-4 w-4" />
      {commentCount > 0 && (
        <span className="ml-1 text-xs font-medium">{commentCount}</span>
      )}
    </Button>
  )
}
