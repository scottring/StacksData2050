'use client'

import { useEffect, useState } from 'react'
import { AppLayout } from '@/components/layout/app-layout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Plus,
  Download,
  Search,
  HelpCircle,
  Tag,
  Filter,
  ChevronRight,
  Loader2,
  CheckCircle2,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface Question {
  id: string
  name: string | null
  content: string | null
  question_type: string | null
  required: boolean | null
  parent_section_id: string | null
  parent_subsection_id: string | null
  order_number: number | null
  created_at: string | null
}

interface Section {
  id: string
  name: string
  order_number: number | null
}

interface Tag {
  id: string
  name: string
}

interface QuestionTag {
  question_id: string
  tag_id: string
}

export default function QuestionsPage() {
  const [questions, setQuestions] = useState<Question[]>([])
  const [sections, setSections] = useState<Section[]>([])
  const [tags, setTags] = useState<Tag[]>([])
  const [questionTags, setQuestionTags] = useState<QuestionTag[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterSection, setFilterSection] = useState<string>('all')
  const [filterType, setFilterType] = useState<string>('all')
  const [filterTag, setFilterTag] = useState<string>('all')

  // Add Question Dialog state
  const [dialogOpen, setDialogOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [newQuestion, setNewQuestion] = useState({
    content: '',
    question_type: 'text',
    parent_section_id: '',
    required: false,
  })

  // Handle creating a new custom question
  const handleCreateQuestion = async () => {
    if (!newQuestion.content.trim()) return

    setSaving(true)
    const supabase = createClient()

    // Find the highest order number in the selected section
    const sectionQuestions = questions.filter(q => q.parent_section_id === newQuestion.parent_section_id)
    const maxOrder = sectionQuestions.reduce((max, q) => Math.max(max, q.order_number || 0), 0)

    const { data, error } = await supabase
      .from('questions')
      .insert({
        content: newQuestion.content,
        name: newQuestion.content.substring(0, 100),
        question_type: newQuestion.question_type,
        parent_section_id: newQuestion.parent_section_id || null,
        required: newQuestion.required,
        order_number: maxOrder + 1,
        created_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating question:', error)
      setSaving(false)
      return
    }

    // Add to local state
    if (data) {
      setQuestions(prev => [...prev, data])
    }

    setSaving(false)
    setSaveSuccess(true)

    // Reset form after short delay
    setTimeout(() => {
      setSaveSuccess(false)
      setDialogOpen(false)
      setNewQuestion({
        content: '',
        question_type: 'text',
        parent_section_id: '',
        required: false,
      })
    }, 1500)
  }

  useEffect(() => {
    async function fetchQuestions() {
      const supabase = createClient()

      // Fetch questions
      const { data: questionsData, error: questionsError } = await supabase
        .from('questions')
        .select('id, name, content, question_type, required, parent_section_id, parent_subsection_id, order_number, created_at')
        .order('order_number', { ascending: true })

      if (questionsError) {
        console.error('Error fetching questions:', questionsError)
      }

      // Fetch sections for filtering
      const { data: sectionsData } = await supabase
        .from('sections')
        .select('id, name, order_number')
        .order('order_number', { ascending: true })

      // Fetch tags
      const { data: tagsData } = await supabase
        .from('tags')
        .select('id, name')
        .order('name')

      // Fetch question-tag relationships
      const { data: questionTagsData } = await supabase
        .from('question_tags')
        .select('question_id, tag_id')

      setQuestions(questionsData || [])
      setSections(sectionsData || [])
      setTags(tagsData || [])
      setQuestionTags(questionTagsData || [])
      setLoading(false)
    }

    fetchQuestions()
  }, [])

  // Get unique question types
  const questionTypes = [...new Set(questions.map(q => q.question_type).filter(Boolean))]

  // Get tags for a question
  const getQuestionTags = (questionId: string): Tag[] => {
    const tagIds = questionTags
      .filter(qt => qt.question_id === questionId)
      .map(qt => qt.tag_id)
    return tags.filter(t => tagIds.includes(t.id))
  }

  // Get section name
  const getSectionName = (sectionId: string | null): string => {
    if (!sectionId) return 'No Section'
    const section = sections.find(s => s.id === sectionId)
    return section?.name || 'Unknown'
  }

  // Filter questions
  const filteredQuestions = questions.filter(q => {
    // Search filter
    const matchesSearch = searchQuery === '' ||
      q.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      q.content?.toLowerCase().includes(searchQuery.toLowerCase())

    // Section filter
    const matchesSection = filterSection === 'all' ||
      q.parent_section_id === filterSection

    // Type filter
    const matchesType = filterType === 'all' ||
      q.question_type === filterType

    // Tag filter
    const matchesTag = filterTag === 'all' ||
      questionTags.some(qt => qt.question_id === q.id && qt.tag_id === filterTag)

    return matchesSearch && matchesSection && matchesType && matchesTag
  })

  // Format question type for display
  const formatQuestionType = (type: string | null): string => {
    if (!type) return 'Unknown'
    return type
      .replace(/_/g, ' ')
      .replace(/\b\w/g, c => c.toUpperCase())
  }

  // Get badge variant based on question type
  const getTypeBadgeClass = (type: string | null): string => {
    switch (type) {
      case 'yes_no':
      case 'boolean':
        return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
      case 'text':
      case 'text_area':
        return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
      case 'number':
      case 'date':
        return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
      case 'dropdown':
      case 'single_choice':
      case 'multiple_choice':
        return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
      case 'file':
        return 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400'
      case 'list_table':
        return 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400'
      default:
        return 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400'
    }
  }

  return (
    <AppLayout title="Questions">
      <div className="space-y-6">
        {/* Header with actions */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Questions</h1>
            <p className="text-muted-foreground mt-1">
              Manage your questionnaire questions and tags
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Custom Question
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>Add Custom Question</DialogTitle>
                  <DialogDescription>
                    Create a custom question for your questionnaires. This allows manufacturers to add their own compliance questions.
                  </DialogDescription>
                </DialogHeader>
                {saveSuccess ? (
                  <div className="flex flex-col items-center justify-center py-8 gap-3">
                    <CheckCircle2 className="h-12 w-12 text-green-600" />
                    <p className="text-lg font-medium">Question Created!</p>
                  </div>
                ) : (
                  <div className="grid gap-4 py-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Question Text</label>
                      <textarea
                        className="w-full min-h-[100px] px-3 py-2 border rounded-md bg-background text-sm"
                        placeholder="Enter your question..."
                        value={newQuestion.content}
                        onChange={(e) => setNewQuestion(prev => ({ ...prev, content: e.target.value }))}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Question Type</label>
                        <Select
                          value={newQuestion.question_type}
                          onValueChange={(value) => setNewQuestion(prev => ({ ...prev, question_type: value }))}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="text">Text</SelectItem>
                            <SelectItem value="text_area">Text Area</SelectItem>
                            <SelectItem value="yes_no">Yes/No</SelectItem>
                            <SelectItem value="number">Number</SelectItem>
                            <SelectItem value="date">Date</SelectItem>
                            <SelectItem value="dropdown">Dropdown</SelectItem>
                            <SelectItem value="file">File Upload</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Section</label>
                        <Select
                          value={newQuestion.parent_section_id}
                          onValueChange={(value) => setNewQuestion(prev => ({ ...prev, parent_section_id: value }))}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select section" />
                          </SelectTrigger>
                          <SelectContent>
                            {sections.map(section => (
                              <SelectItem key={section.id} value={section.id}>
                                {section.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="required"
                        checked={newQuestion.required}
                        onChange={(e) => setNewQuestion(prev => ({ ...prev, required: e.target.checked }))}
                        className="h-4 w-4 rounded border-gray-300"
                      />
                      <label htmlFor="required" className="text-sm">
                        Required question (suppliers must answer)
                      </label>
                    </div>
                  </div>
                )}
                {!saveSuccess && (
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleCreateQuestion} disabled={saving || !newQuestion.content.trim()}>
                      {saving ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Creating...
                        </>
                      ) : (
                        <>
                          <Plus className="h-4 w-4 mr-2" />
                          Create Question
                        </>
                      )}
                    </Button>
                  </DialogFooter>
                )}
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Search and filters */}
        <div className="flex flex-wrap items-center gap-4">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search questions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          <Select value={filterSection} onValueChange={setFilterSection}>
            <SelectTrigger className="w-[180px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Section" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Sections</SelectItem>
              {sections.map(section => (
                <SelectItem key={section.id} value={section.id}>
                  {section.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-[180px]">
              <HelpCircle className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {questionTypes.map(type => (
                <SelectItem key={type} value={type!}>
                  {formatQuestionType(type)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filterTag} onValueChange={setFilterTag}>
            <SelectTrigger className="w-[180px]">
              <Tag className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Tag" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Tags</SelectItem>
              {tags.map(tag => (
                <SelectItem key={tag.id} value={tag.id}>
                  {tag.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Badge variant="secondary" className="text-sm">
            {filteredQuestions.length} questions
          </Badge>
        </div>

        {/* Questions table */}
        <div className="rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]">#</TableHead>
                <TableHead className="w-[400px]">Question</TableHead>
                <TableHead className="w-[150px]">Type</TableHead>
                <TableHead className="w-[150px]">Section</TableHead>
                <TableHead>Tags</TableHead>
                <TableHead className="w-[80px]">Required</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12">
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      <Loader2 className="h-8 w-8 animate-spin" />
                      <span>Loading questions...</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : filteredQuestions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12">
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      <HelpCircle className="h-12 w-12 opacity-30" />
                      <span>No questions found</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredQuestions.map((question, index) => {
                  const qTags = getQuestionTags(question.id)

                  return (
                    <TableRow
                      key={question.id}
                      className="cursor-pointer hover:bg-muted/50"
                    >
                      <TableCell className="text-muted-foreground">
                        {question.order_number || index + 1}
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium line-clamp-2">
                            {question.name || question.content || 'Untitled Question'}
                          </div>
                          {question.content && question.name && (
                            <div className="text-sm text-muted-foreground line-clamp-1 mt-1">
                              {question.content}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={getTypeBadgeClass(question.question_type)}>
                          {formatQuestionType(question.question_type)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {getSectionName(question.parent_section_id)}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {qTags.length === 0 ? (
                            <span className="text-muted-foreground text-sm">No tags</span>
                          ) : (
                            qTags.slice(0, 3).map(tag => (
                              <Badge key={tag.id} variant="outline" className="text-xs">
                                {tag.name}
                              </Badge>
                            ))
                          )}
                          {qTags.length > 3 && (
                            <Badge variant="outline" className="text-xs">
                              +{qTags.length - 3}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {question.required ? (
                          <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                            Required
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground text-sm">Optional</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <ChevronRight className="h-5 w-5 text-muted-foreground" />
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </AppLayout>
  )
}
