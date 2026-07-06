import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { FileUp, Shield, FileText, ArrowRight, Zap } from 'lucide-react'
import Link from 'next/link'

export default async function PipelinePage() {
  const supabase = await createClient()

  // Get counts for overview
  const { count: extractionCount } = await supabase
    .from('extraction_documents')
    .select('*', { count: 'exact', head: true })

  const { count: assessmentCount } = await supabase
    .from('compliance_assessments')
    .select('*', { count: 'exact', head: true })

  const { count: documentCount } = await supabase
    .from('generated_documents')
    .select('*', { count: 'exact', head: true })

  const steps = [
    {
      title: 'Extract',
      description: 'Upload SDS, CoA, lab reports, and SAP exports. Claude AI extracts structured chemical, safety, and compliance data automatically.',
      icon: FileUp,
      href: '/pipeline/extract',
      count: extractionCount ?? 0,
      countLabel: 'documents processed',
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50',
      borderColor: 'border-emerald-200',
    },
    {
      title: 'Assess',
      description: 'Evaluate extracted data against 6 regulatory frameworks: REACH, TSCA, China EPA, K-REACH, DPP, and BfR. Automated compliance checking.',
      icon: Shield,
      href: '/pipeline/compliance',
      count: assessmentCount ?? 0,
      countLabel: 'assessments run',
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
    },
    {
      title: 'Generate',
      description: 'Produce formatted compliance documents: REACH SVHC declarations, FDA letters, Digital Product Passports, and China GB certificates.',
      icon: FileText,
      href: '/pipeline/documents',
      count: documentCount ?? 0,
      countLabel: 'documents generated',
      color: 'text-violet-600',
      bgColor: 'bg-violet-50',
      borderColor: 'border-violet-200',
    },
  ]

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Zap className="h-5 w-5 text-emerald-500" />
          <Badge variant="outline" className="text-emerald-600 border-emerald-200 bg-emerald-50">
            Intelligence Pipeline
          </Badge>
        </div>
        <h1 className="text-2xl font-bold text-slate-900">
          Document to Compliance, Automatically
        </h1>
        <p className="text-slate-500 mt-1">
          Upload supplier documents, extract data with AI, assess regulatory compliance, and generate formatted output documents.
        </p>
      </div>

      {/* Pipeline steps */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {steps.map((step, i) => {
          const Icon = step.icon
          return (
            <div key={step.title} className="relative">
              <Link href={step.href}>
                <Card className={`h-full border ${step.borderColor} hover:shadow-md transition-shadow cursor-pointer`}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className={`h-10 w-10 rounded-lg ${step.bgColor} flex items-center justify-center`}>
                        <Icon className={`h-5 w-5 ${step.color}`} />
                      </div>
                      <span className="text-xs font-mono text-slate-400">Step {i + 1}</span>
                    </div>
                    <CardTitle className="text-lg">{step.title}</CardTitle>
                    <CardDescription>{step.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-slate-500">
                        <span className="font-semibold text-slate-900">{step.count}</span>{' '}
                        {step.countLabel}
                      </div>
                      <ArrowRight className="h-4 w-4 text-slate-400" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
              {/* Connector arrow between cards */}
              {i < steps.length - 1 && (
                <div className="hidden md:block absolute top-1/2 -right-3 z-10">
                  <ArrowRight className="h-5 w-5 text-slate-300" />
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
