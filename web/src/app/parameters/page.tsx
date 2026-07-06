'use client'

import { useEffect, useState } from 'react'
import { AppLayout } from '@/components/layout/app-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { createClient } from '@/lib/supabase/client'
import { Database, Layers, FlaskConical, ChevronDown, ChevronRight, TableProperties } from 'lucide-react'

interface CanonicalParameter {
  id: string
  code: string
  section: string
  subsection: string | null
  name: string
  description: string | null
  jurisdiction: string | null
  answer_type_code: string
  answer_pattern: string
  detail_table_schema: unknown[] | null
  sort_order: number
  is_active: boolean
}

interface AnswerType {
  code: string
  label: string
  options: string[]
}

interface ReferenceSubstance {
  id: string
  cas_number: string | null
  chemical_name: string
  declaration_level_ppm: string | null
}

const JURISDICTION_COLORS: Record<string, string> = {
  EU: 'bg-blue-50 text-blue-700 border-blue-200',
  DE: 'bg-amber-50 text-amber-700 border-amber-200',
  US: 'bg-red-50 text-red-700 border-red-200',
  CN: 'bg-rose-50 text-rose-700 border-rose-200',
  NL: 'bg-orange-50 text-orange-700 border-orange-200',
  CH: 'bg-red-50 text-red-600 border-red-200',
  IT: 'bg-green-50 text-green-700 border-green-200',
  FR: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  MERCOSUR: 'bg-teal-50 text-teal-700 border-teal-200',
  GLOBAL: 'bg-slate-50 text-slate-600 border-slate-200',
}

const SECTION_COLORS: Record<string, string> = {
  'Ecolabels': 'from-emerald-500 to-emerald-600',
  'Biocides': 'from-amber-500 to-amber-600',
  'Food Contact': 'from-blue-500 to-blue-600',
  'PIDSL': 'from-violet-500 to-violet-600',
  'Additional Requirements': 'from-rose-500 to-rose-600',
}

const SECTION_ICONS: Record<string, string> = {
  'Ecolabels': '🌿',
  'Biocides': '🧪',
  'Food Contact': '🍽️',
  'PIDSL': '📋',
  'Additional Requirements': '📎',
}

function StatCard({ title, value, icon: Icon, color }: {
  title: string
  value: number | string
  icon: React.ComponentType<{ className?: string }>
  color: string
}) {
  return (
    <div className="flex items-center gap-4 rounded-xl border border-slate-200/60 bg-white p-5 shadow-sm">
      <div className={`flex h-11 w-11 items-center justify-center rounded-xl bg-${color}-50`}>
        <Icon className={`h-5 w-5 text-${color}-600`} />
      </div>
      <div>
        <p className="text-2xl font-semibold text-slate-900">{value}</p>
        <p className="text-sm text-slate-500">{title}</p>
      </div>
    </div>
  )
}

function SectionGroup({ section, params, answerTypes, defaultOpen = false }: {
  section: string
  params: CanonicalParameter[]
  answerTypes: Map<string, AnswerType>
  defaultOpen?: boolean
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  // Group by subsection
  const subsections = new Map<string, CanonicalParameter[]>()
  for (const p of params) {
    const key = p.subsection || 'General'
    if (!subsections.has(key)) subsections.set(key, [])
    subsections.get(key)!.push(p)
  }

  const gradient = SECTION_COLORS[section] || 'from-slate-500 to-slate-600'
  const emoji = SECTION_ICONS[section] || '📄'

  return (
    <Card className="overflow-hidden opacity-0 animate-fade-in-up" style={{ animationFillMode: 'forwards' }}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center gap-4 px-6 py-4 text-left hover:bg-slate-50/50 transition-colors"
      >
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${gradient} text-white text-lg shadow-sm`}>
          {emoji}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-semibold text-slate-900">{section}</h3>
          <p className="text-sm text-slate-500">
            {params.length} parameters · {subsections.size} subsection{subsections.size !== 1 ? 's' : ''}
          </p>
        </div>
        {isOpen
          ? <ChevronDown className="h-5 w-5 text-slate-400" />
          : <ChevronRight className="h-5 w-5 text-slate-400" />
        }
      </button>

      {isOpen && (
        <CardContent className="px-6 pb-6 pt-0">
          {[...subsections.entries()].map(([subsection, items]) => (
            <div key={subsection} className="mt-4 first:mt-0">
              <h4 className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
                <Layers className="h-3.5 w-3.5 text-slate-400" />
                {subsection}
                <span className="text-xs font-normal text-slate-400">({items.length})</span>
              </h4>
              <div className="rounded-lg border border-slate-200/60 overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50/80 border-b border-slate-200/60">
                      <th className="px-3 py-2 text-left font-medium text-slate-500 w-20">Code</th>
                      <th className="px-3 py-2 text-left font-medium text-slate-500">Question</th>
                      <th className="px-3 py-2 text-left font-medium text-slate-500 w-28">Answer Type</th>
                      <th className="px-3 py-2 text-left font-medium text-slate-500 w-24">Jurisdiction</th>
                      <th className="px-3 py-2 text-center font-medium text-slate-500 w-16">Detail</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((p, i) => {
                      const at = answerTypes.get(p.answer_type_code)
                      const jColor = JURISDICTION_COLORS[p.jurisdiction || 'GLOBAL'] || JURISDICTION_COLORS.GLOBAL
                      return (
                        <tr key={p.id} className={`border-b border-slate-100 last:border-0 hover:bg-slate-50/50 transition-colors ${i % 2 === 0 ? '' : 'bg-slate-50/30'}`}>
                          <td className="px-3 py-2.5">
                            <span className="font-mono text-xs font-medium text-slate-600 bg-slate-100 rounded px-1.5 py-0.5">
                              {p.code}
                            </span>
                          </td>
                          <td className="px-3 py-2.5 text-slate-700 leading-snug">
                            {p.name}
                          </td>
                          <td className="px-3 py-2.5">
                            <span
                              className="inline-block text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full px-2 py-0.5 cursor-help"
                              title={at ? `${at.label}\n\nOptions:\n${at.options.join('\n')}` : p.answer_type_code}
                            >
                              {p.answer_type_code}
                            </span>
                          </td>
                          <td className="px-3 py-2.5">
                            <span className={`inline-block text-xs font-medium border rounded-full px-2 py-0.5 ${jColor}`}>
                              {p.jurisdiction || 'N/A'}
                            </span>
                          </td>
                          <td className="px-3 py-2.5 text-center">
                            {p.answer_pattern === 'with_detail_table' && (
                              <span
                                className="inline-flex items-center gap-1 text-xs text-violet-600 cursor-help"
                                title={p.detail_table_schema
                                  ? `Columns: ${(p.detail_table_schema as Array<{label: string}>).map(c => c.label).join(', ')}`
                                  : 'Detail table'
                                }
                              >
                                <TableProperties className="h-3.5 w-3.5" />
                              </span>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </CardContent>
      )}
    </Card>
  )
}

export default function ParametersPage() {
  const [params, setParams] = useState<CanonicalParameter[]>([])
  const [answerTypes, setAnswerTypes] = useState<Map<string, AnswerType>>(new Map())
  const [substanceCount, setSubstanceCount] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const supabase = createClient()

      const [pRes, atRes, sRes] = await Promise.all([
        supabase.from('canonical_parameters').select('*').order('sort_order'),
        supabase.from('canonical_answer_types').select('*'),
        supabase.from('canonical_reference_substances').select('*', { count: 'exact', head: true }),
      ])

      if (pRes.data) setParams(pRes.data)
      if (atRes.data) {
        const map = new Map<string, AnswerType>()
        for (const at of atRes.data) map.set(at.code, at)
        setAnswerTypes(map)
      }
      setSubstanceCount(sRes.count ?? 0)
      setLoading(false)
    }
    load()
  }, [])

  // Group params by section
  const sections = new Map<string, CanonicalParameter[]>()
  for (const p of params) {
    if (!sections.has(p.section)) sections.set(p.section, [])
    sections.get(p.section)!.push(p)
  }

  const withDetail = params.filter(p => p.answer_pattern === 'with_detail_table').length

  return (
    <AppLayout title="Canonical Parameters">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Canonical Parameters</h1>
          <p className="text-sm text-slate-500 mt-1">
            HQ 2.1 workbook — {params.length} parameters across {sections.size} sections
          </p>
        </div>

        {/* Stats */}
        {!loading && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 opacity-0 animate-fade-in-up" style={{ animationFillMode: 'forwards' }}>
            <StatCard title="Parameters" value={params.length} icon={Database} color="emerald" />
            <StatCard title="Answer Types" value={answerTypes.size} icon={Layers} color="blue" />
            <StatCard title="With Detail Table" value={withDetail} icon={TableProperties} color="violet" />
            <StatCard title="PIDSL Substances" value={substanceCount} icon={FlaskConical} color="amber" />
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-200 border-t-emerald-600" />
          </div>
        )}

        {/* Section groups */}
        {!loading && [...sections.entries()].map(([section, sectionParams], i) => (
          <SectionGroup
            key={section}
            section={section}
            params={sectionParams}
            answerTypes={answerTypes}
            defaultOpen={i === 0}
          />
        ))}
      </div>
    </AppLayout>
  )
}
