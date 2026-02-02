'use client'

import { useEffect, useState } from 'react'
import { AppLayout } from '@/components/layout/app-layout'
import { PageHeader } from '@/components/layout/page-header'
import { StatCard } from '@/components/ui/stat-card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Search,
  Tags,
  FileText,
  HelpCircle,
  Plus,
  Loader2,
  ChevronRight,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface Tag {
  id: string
  name: string | null
  description: string | null
  created_at: string | null
  questionCount?: number
  sheetCount?: number
}

export default function TagsPage() {
  const [tags, setTags] = useState<Tag[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    async function fetchTags() {
      const supabase = createClient()

      const { data: tagsData, error } = await supabase
        .from('tags')
        .select('id, name, description, created_at')
        .order('name')

      if (error) {
        console.error('Error fetching tags:', error)
        setLoading(false)
        return
      }

      const { data: questionTagsData } = await supabase
        .from('question_tags')
        .select('tag_id')

      const { data: sheetTagsData } = await supabase
        .from('sheet_tags')
        .select('tag_id')

      const questionCounts = new Map<string, number>()
      questionTagsData?.forEach(qt => {
        questionCounts.set(qt.tag_id, (questionCounts.get(qt.tag_id) || 0) + 1)
      })

      const sheetCounts = new Map<string, number>()
      sheetTagsData?.forEach(st => {
        sheetCounts.set(st.tag_id, (sheetCounts.get(st.tag_id) || 0) + 1)
      })

      const enrichedTags = (tagsData || []).map(tag => ({
        ...tag,
        questionCount: questionCounts.get(tag.id) || 0,
        sheetCount: sheetCounts.get(tag.id) || 0,
      }))

      setTags(enrichedTags)
      setLoading(false)
    }

    fetchTags()
  }, [])

  const filteredTags = tags.filter(tag =>
    tag.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    tag.description?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const totalQuestionLinks = tags.reduce((sum, t) => sum + (t.questionCount || 0), 0)
  const totalSheetLinks = tags.reduce((sum, t) => sum + (t.sheetCount || 0), 0)

  if (loading) {
    return (
      <AppLayout title="Tags">
        <div className="flex items-center justify-center h-64">
          <div className="flex flex-col items-center gap-3 text-slate-500">
            <div className="relative">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-100 to-orange-100 animate-pulse" />
              <Loader2 className="h-6 w-6 animate-spin absolute inset-0 m-auto text-amber-600" />
            </div>
            <span className="text-sm font-medium">Loading tags...</span>
          </div>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout title="Tags">
      <div className="space-y-6 max-w-7xl mx-auto">
        <PageHeader
          title="Tags"
          description="Manage questionnaire versions and question sets"
        >
          <Button className="rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 shadow-sm">
            <Plus className="h-4 w-4 mr-2" />
            Create Tag
          </Button>
        </PageHeader>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatCard title="Total Tags" value={tags.length} icon={Tags} accentColor="amber" delay={100} />
          <StatCard title="Question Links" value={totalQuestionLinks} icon={HelpCircle} accentColor="violet" delay={150} />
          <StatCard title="Sheet Links" value={totalSheetLinks} icon={FileText} accentColor="emerald" delay={200} />
        </div>

        {/* Search */}
        <div className="flex items-center gap-4 opacity-0 animate-fade-in-up animation-delay-200" style={{ animationFillMode: 'forwards' }}>
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search tags..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 rounded-xl border-slate-200 focus:border-amber-300 focus:ring-amber-200"
            />
          </div>
          <Badge variant="secondary" className="rounded-full px-3 py-1 bg-slate-100 text-slate-600">
            {filteredTags.length} tags
          </Badge>
        </div>

        {/* Tags Table */}
        <div className="rounded-2xl border border-slate-200/60 bg-white shadow-sm overflow-hidden opacity-0 animate-fade-in-up animation-delay-300" style={{ animationFillMode: 'forwards' }}>
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50/50 border-b border-slate-100">
                <TableHead className="font-semibold text-slate-700">Tag Name</TableHead>
                <TableHead className="font-semibold text-slate-700">Description</TableHead>
                <TableHead className="text-center font-semibold text-slate-700">Questions</TableHead>
                <TableHead className="text-center font-semibold text-slate-700">Sheets</TableHead>
                <TableHead className="font-semibold text-slate-700">Created</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTags.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-16">
                    <div className="flex flex-col items-center gap-3 text-slate-500">
                      <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center">
                        <Tags className="h-8 w-8 text-slate-400" />
                      </div>
                      <span className="font-medium">No tags found</span>
                      <p className="text-sm text-slate-400">Create a tag to get started</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredTags.map((tag) => (
                  <TableRow key={tag.id} className="cursor-pointer hover:bg-slate-50/50 transition-colors group">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-lg bg-amber-50 flex items-center justify-center">
                          <Tags className="h-4 w-4 text-amber-600" />
                        </div>
                        <Badge variant="outline" className="font-mono text-sm rounded-lg border-slate-200 bg-slate-50/50">
                          {tag.name}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell className="text-slate-500 max-w-[300px] truncate">
                      {tag.description || <span className="text-slate-300">No description</span>}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge className="bg-violet-50 text-violet-700 border-violet-200/50 font-medium">
                        <HelpCircle className="h-3 w-3 mr-1" />
                        {tag.questionCount}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200/50 font-medium">
                        <FileText className="h-3 w-3 mr-1" />
                        {tag.sheetCount}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-slate-500">
                      {tag.created_at
                        ? new Date(tag.created_at).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                          })
                        : <span className="text-slate-300">-</span>}
                    </TableCell>
                    <TableCell>
                      <ChevronRight className="h-5 w-5 text-slate-300 group-hover:text-slate-500 group-hover:translate-x-0.5 transition-all" />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </AppLayout>
  )
}
