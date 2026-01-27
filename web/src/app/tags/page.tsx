'use client'

import { useEffect, useState } from 'react'
import { AppLayout } from '@/components/layout/app-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
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

      // Fetch tags
      const { data: tagsData, error } = await supabase
        .from('tags')
        .select('id, name, description, created_at')
        .order('name')

      if (error) {
        console.error('Error fetching tags:', error)
        setLoading(false)
        return
      }

      // Fetch question counts per tag
      const { data: questionTagsData } = await supabase
        .from('question_tags')
        .select('tag_id')

      // Fetch sheet counts per tag
      const { data: sheetTagsData } = await supabase
        .from('sheet_tags')
        .select('tag_id')

      // Count questions and sheets per tag
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

  return (
    <AppLayout title="Tags">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Tags</h1>
            <p className="text-muted-foreground mt-1">
              Manage questionnaire versions and question sets
            </p>
          </div>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Create Tag
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg dark:bg-blue-900/30">
                  <Tags className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{tags.length}</p>
                  <p className="text-xs text-muted-foreground">Total Tags</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-lg dark:bg-purple-900/30">
                  <HelpCircle className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {tags.reduce((sum, t) => sum + (t.questionCount || 0), 0)}
                  </p>
                  <p className="text-xs text-muted-foreground">Question-Tag Links</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg dark:bg-green-900/30">
                  <FileText className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {tags.reduce((sum, t) => sum + (t.sheetCount || 0), 0)}
                  </p>
                  <p className="text-xs text-muted-foreground">Sheet-Tag Links</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search tags..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Badge variant="secondary">{filteredTags.length} tags</Badge>
        </div>

        {/* Tags Table */}
        <div className="rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tag Name</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-center">Questions</TableHead>
                <TableHead className="text-center">Sheets</TableHead>
                <TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-12">
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      <Loader2 className="h-8 w-8 animate-spin" />
                      <span>Loading tags...</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : filteredTags.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-12">
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      <Tags className="h-12 w-12 opacity-30" />
                      <span>No tags found</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredTags.map((tag) => (
                  <TableRow key={tag.id} className="cursor-pointer hover:bg-muted/50">
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="font-mono">
                          {tag.name}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground max-w-[300px] truncate">
                      {tag.description || '-'}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="secondary">{tag.questionCount}</Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="secondary">{tag.sheetCount}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {tag.created_at
                        ? new Date(tag.created_at).toLocaleDateString()
                        : '-'}
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
