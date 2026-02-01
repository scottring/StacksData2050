'use client'

import { useEffect, useState } from 'react'
import { AppLayout } from '@/components/layout/app-layout'
import { PageHeader } from '@/components/layout/page-header'
import { StatCard } from '@/components/ui/stat-card'
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
  FileText,
  ListChecks,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

interface Question {
  id: string
  name: string | null
  content: string | null
  response_type: string | null
  required: boolean | null
  section_sort_number: number | null
  subsection_id: string | null
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

  const [dialogOpen, setDialogOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [newQuestion, setNewQuestion] = useState({
    content: '',
    response_type: 'text',
    section_sort_number: null as number | null,
    required: false,
  })

  const handleCreateQuestion = async () => {
    if (!newQuestion.content.trim()) return

    setSaving(true)
    const supabase = createClient()

    const sectionQuestions = questions.filter(q => q.section_sort_number === newQuestion.section_sort_number)
    const maxOrder = sectionQuestions.reduce((max, q) => Math.max(max, q.order_number || 0), 0)

    const { data, error } = await supabase
      .from('questions')
      .insert({
        content: newQuestion.content,
        name: newQuestion.content.substring(0, 100),
        response_type: newQuestion.response_type,
        section_sort_number: newQuestion.section_sort_number || null,
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

    if (data) {
      setQuestions(prev => [...prev, data])
    }

    setSaving(false)
    setSaveSuccess(true)

    setTimeout(() => {
      setSaveSuccess(false)
      setDialogOpen(false)
      setNewQuestion({
        content: '',
        response_type: 'text',
        section_sort_number: null as number | null,
        required: false,
      })
    }, 1500)
  }

  useEffect(() => {
    async function fetchQuestions() {
      const supabase = createClient()

      const { data: questionsData, error: questionsError } = await supabase
        .from('questions')
        .select('id, name, content, response_type, required, section_sort_number, subsection_id, order_number, created_at')
        .order('order_number', { ascending: true })

      if (questionsError) {
        console.error('Error fetching questions:', questionsError)
      }

      const { data: sectionsData } = await supabase
        .from('sections')
        .select('id, name, order_number')
        .order('order_number', { ascending: true })

      const { data: tagsData } = await supabase
        .from('tags')
        .select('id, name')
        .order('name')

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

  const questionTypes = [...new Set(questions.map(q => q.response_type).filter(Boolean))]
  const requiredCount = questions.filter(q => q.required).length

  const getQuestionTags = (questionId: string): Tag[] => {
    const tagIds = questionTags
      .filter(qt => qt.question_id === questionId)
      .map(qt => qt.tag_id)
    return tags.filter(t => tagIds.includes(t.id))
  }

  const getSectionName = (sectionSortNumber: number | null): string => {
    if (sectionSortNumber === null || sectionSortNumber === undefined) return 'No Section'
    const section = sections.find(s => s.order_number === sectionSortNumber)
    return section?.name || 'Unknown'
  }

  const filteredQuestions = questions.filter(q => {
    const matchesSearch = searchQuery === '' ||
      q.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      q.content?.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesSection = filterSection === 'all' ||
      q.section_sort_number === (filterSection === "all" ? null : Number(filterSection))

    const matchesType = filterType === 'all' || q.response_type === filterType

    const matchesTag = filterTag === 'all' ||
      questionTags.some(qt => qt.question_id === q.id && qt.tag_id === filterTag)

    return matchesSearch && matchesSection && matchesType && matchesTag
  })

  const formatQuestionType = (type: string | null): string => {
    if (!type) return 'Unknown'
    return type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
  }

  const getTypeBadgeClass = (type: string | null): string => {
    switch (type) {
      case 'yes_no':
      case 'boolean':
        return 'bg-sky-50 text-sky-700 border-sky-200/50'
      case 'text':
      case 'text_area':
        return 'bg-violet-50 text-violet-700 border-violet-200/50'
      case 'number':
      case 'date':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200/50'
      case 'dropdown':
      case 'single_choice':
      case 'multiple_choice':
        return 'bg-amber-50 text-amber-700 border-amber-200/50'
      case 'file':
        return 'bg-rose-50 text-rose-700 border-rose-200/50'
      case 'list_table':
        return 'bg-cyan-50 text-cyan-700 border-cyan-200/50'
      default:
        return 'bg-slate-50 text-slate-600 border-slate-200/50'
    }
  }

  if (loading) {
    return (
      <AppLayout title="Questions">
        <div className="flex items-center justify-center h-64">
          <div className="flex flex-col items-center gap-3 text-slate-500">
            <div className="relative">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-100 to-amber-100 animate-pulse" />
              <Loader2 className="h-6 w-6 animate-spin absolute inset-0 m-auto text-violet-600" />
            </div>
            <span className="text-sm font-medium">Loading questions...</span>
          </div>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout title="Questions">
      <div className="space-y-6 max-w-7xl mx-auto">
        <PageHeader
          title="Questions"
          description="Manage your questionnaire questions and tags"
        >
          <Button variant="outline" size="sm" className="rounded-xl border-slate-200 hover:bg-slate-50">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 shadow-sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Custom Question
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px] rounded-2xl">
              <DialogHeader>
                <DialogTitle className="font-display text-xl">Add Custom Question</DialogTitle>
                <DialogDescription>
                  Create a custom question for your questionnaires.
                </DialogDescription>
              </DialogHeader>
              {saveSuccess ? (
                <div className="flex flex-col items-center justify-center py-8 gap-3">
                  <div className="w-16 h-16 rounded-2xl bg-emerald-100 flex items-center justify-center">
                    <CheckCircle2 className="h-8 w-8 text-emerald-600" />
                  </div>
                  <p className="text-lg font-medium text-slate-900">Question Created!</p>
                </div>
              ) : (
                <div className="grid gap-4 py-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">Question Text</label>
                    <textarea
                      className="w-full min-h-[100px] px-3 py-2 border border-slate-200 rounded-xl bg-white text-sm focus:border-emerald-300 focus:ring-emerald-200 focus:ring-2 focus:outline-none"
                      placeholder="Enter your question..."
                      value={newQuestion.content}
                      onChange={(e) => setNewQuestion(prev => ({ ...prev, content: e.target.value }))}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-700">Question Type</label>
                      <Select
                        value={newQuestion.response_type}
                        onValueChange={(value) => setNewQuestion(prev => ({ ...prev, response_type: value }))}
                      >
                        <SelectTrigger className="rounded-xl border-slate-200">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl">
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
                      <label className="text-sm font-medium text-slate-700">Section</label>
                      <Select
                        value={newQuestion.section_sort_number ? String(newQuestion.section_sort_number) : ""}
                        onValueChange={(value) => setNewQuestion(prev => ({ ...prev, section_sort_number: value ? Number(value) : null }))}
                      >
                        <SelectTrigger className="rounded-xl border-slate-200">
                          <SelectValue placeholder="Select section" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl">
                          {sections.map(section => (
                            <SelectItem key={section.id} value={String(section.order_number)}>
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
                      className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                    />
                    <label htmlFor="required" className="text-sm text-slate-600">
                      Required question (suppliers must answer)
                    </label>
                  </div>
                </div>
              )}
              {!saveSuccess && (
                <DialogFooter>
                  <Button variant="outline" onClick={() => setDialogOpen(false)} className="rounded-xl">
                    Cancel
                  </Button>
                  <Button
                    onClick={handleCreateQuestion}
                    disabled={saving || !newQuestion.content.trim()}
                    className="rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400"
                  >
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
        </PageHeader>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <StatCard title="Total Questions" value={questions.length} icon={HelpCircle} accentColor="violet" delay={100} />
          <StatCard title="Sections" value={sections.length} icon={FileText} accentColor="sky" delay={150} />
          <StatCard title="Required" value={requiredCount} icon={CheckCircle2} accentColor="rose" delay={200} />
          <StatCard title="Tags" value={tags.length} icon={Tag} accentColor="amber" delay={250} />
        </div>

        {/* Search and filters */}
        <div className="flex flex-wrap items-center gap-4 opacity-0 animate-fade-in-up animation-delay-200" style={{ animationFillMode: 'forwards' }}>
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search questions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 rounded-xl border-slate-200 focus:border-violet-300 focus:ring-violet-200"
            />
          </div>

          <Select value={filterSection} onValueChange={setFilterSection}>
            <SelectTrigger className="w-[180px] rounded-xl border-slate-200">
              <Filter className="h-4 w-4 mr-2 text-slate-400" />
              <SelectValue placeholder="Section" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="all">All Sections</SelectItem>
              {sections.map(section => (
                <SelectItem key={section.id} value={String(section.order_number)}>
                  {section.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-[180px] rounded-xl border-slate-200">
              <ListChecks className="h-4 w-4 mr-2 text-slate-400" />
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="all">All Types</SelectItem>
              {questionTypes.map(type => (
                <SelectItem key={type} value={type!}>
                  {formatQuestionType(type)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filterTag} onValueChange={setFilterTag}>
            <SelectTrigger className="w-[180px] rounded-xl border-slate-200">
              <Tag className="h-4 w-4 mr-2 text-slate-400" />
              <SelectValue placeholder="Tag" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="all">All Tags</SelectItem>
              {tags.map(tag => (
                <SelectItem key={tag.id} value={tag.id}>
                  {tag.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Badge variant="secondary" className="rounded-full px-3 py-1 bg-slate-100 text-slate-600">
            {filteredQuestions.length} questions
          </Badge>
        </div>

        {/* Questions table */}
        <div className="rounded-2xl border border-slate-200/60 bg-white shadow-sm overflow-hidden opacity-0 animate-fade-in-up animation-delay-300" style={{ animationFillMode: 'forwards' }}>
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50/50 border-b border-slate-100">
                <TableHead className="w-[50px] font-semibold text-slate-700">#</TableHead>
                <TableHead className="w-[400px] font-semibold text-slate-700">Question</TableHead>
                <TableHead className="w-[150px] font-semibold text-slate-700">Type</TableHead>
                <TableHead className="w-[150px] font-semibold text-slate-700">Section</TableHead>
                <TableHead className="font-semibold text-slate-700">Tags</TableHead>
                <TableHead className="w-[80px] font-semibold text-slate-700">Required</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredQuestions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-16">
                    <div className="flex flex-col items-center gap-3 text-slate-500">
                      <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center">
                        <HelpCircle className="h-8 w-8 text-slate-400" />
                      </div>
                      <span className="font-medium">No questions found</span>
                      <p className="text-sm text-slate-400">Try adjusting your search or filters</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredQuestions.map((question, index) => {
                  const qTags = getQuestionTags(question.id)

                  return (
                    <TableRow
                      key={question.id}
                      className="cursor-pointer hover:bg-slate-50/50 transition-colors group"
                    >
                      <TableCell className="text-slate-400 font-mono text-sm">
                        {question.order_number || index + 1}
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium text-slate-900 line-clamp-2">
                            {question.name || question.content || 'Untitled Question'}
                          </div>
                          {question.content && question.name && (
                            <div className="text-sm text-slate-500 line-clamp-1 mt-1">
                              {question.content}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={cn("border font-medium", getTypeBadgeClass(question.response_type))}>
                          {formatQuestionType(question.response_type)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-slate-500">
                        {getSectionName(question.section_sort_number)}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1.5">
                          {qTags.length === 0 ? (
                            <span className="text-slate-400 text-sm">No tags</span>
                          ) : (
                            qTags.slice(0, 3).map(tag => (
                              <Badge key={tag.id} variant="outline" className="text-xs rounded-full border-slate-200 text-slate-600">
                                {tag.name}
                              </Badge>
                            ))
                          )}
                          {qTags.length > 3 && (
                            <Badge variant="outline" className="text-xs rounded-full border-slate-200 text-slate-600">
                              +{qTags.length - 3}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {question.required ? (
                          <Badge className="bg-rose-50 text-rose-700 border-rose-200/50 font-medium">
                            Required
                          </Badge>
                        ) : (
                          <span className="text-slate-400 text-sm">Optional</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <ChevronRight className="h-5 w-5 text-slate-300 group-hover:text-slate-500 group-hover:translate-x-0.5 transition-all" />
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
