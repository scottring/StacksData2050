'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2, FileText, ShieldCheck, Code2, Globe } from 'lucide-react'

const DOC_TYPES = [
  {
    type: 'reach_svhc_declaration',
    label: 'REACH SVHC Declaration',
    description: 'EU Article 33 declaration for Substances of Very High Concern',
    icon: ShieldCheck,
    color: 'text-blue-600 bg-blue-50 border-blue-200',
  },
  {
    type: 'fda_compliance_letter',
    label: 'FDA Compliance Letter',
    description: '21 CFR food contact compliance statement',
    icon: FileText,
    color: 'text-emerald-600 bg-emerald-50 border-emerald-200',
  },
  {
    type: 'dpp_json_ld',
    label: 'Digital Product Passport',
    description: 'EU ESPR compliant JSON-LD verifiable credential',
    icon: Code2,
    color: 'text-violet-600 bg-violet-50 border-violet-200',
  },
  {
    type: 'china_gb_certificate',
    label: 'China GB Certificate',
    description: 'GB 9685-2016 food contact compliance certificate',
    icon: Globe,
    color: 'text-red-600 bg-red-50 border-red-200',
  },
]

export default function DocumentListClient() {
  const router = useRouter()
  const [generating, setGenerating] = useState<string | null>(null)
  const [assessmentId, setAssessmentId] = useState('')

  const handleGenerate = async (docType: string) => {
    if (!assessmentId.trim()) return

    setGenerating(docType)
    try {
      const res = await fetch('/api/documents/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assessment_id: assessmentId,
          document_type: docType,
        }),
      })

      if (res.ok) {
        router.refresh()
      }
    } finally {
      setGenerating(null)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Generate New Document</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <label className="text-xs font-medium text-slate-600 block mb-1">Assessment ID</label>
          <input
            type="text"
            value={assessmentId}
            onChange={(e) => setAssessmentId(e.target.value)}
            placeholder="Paste a compliance assessment ID..."
            className="w-full text-sm border rounded-lg px-3 py-2"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {DOC_TYPES.map((doc) => {
            const Icon = doc.icon
            return (
              <Button
                key={doc.type}
                variant="outline"
                className={`h-auto py-3 px-4 justify-start text-left border ${assessmentId ? '' : 'opacity-50'}`}
                disabled={!assessmentId || generating !== null}
                onClick={() => handleGenerate(doc.type)}
              >
                <div className="flex items-start gap-3">
                  <Icon className="h-5 w-5 mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="text-sm font-medium">
                      {generating === doc.type ? (
                        <span className="flex items-center gap-2">
                          <Loader2 className="h-3 w-3 animate-spin" /> Generating...
                        </span>
                      ) : (
                        doc.label
                      )}
                    </div>
                    <div className="text-[10px] text-slate-500 font-normal">{doc.description}</div>
                  </div>
                </div>
              </Button>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
