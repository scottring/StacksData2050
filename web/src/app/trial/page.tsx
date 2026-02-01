'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { FileSpreadsheet, Send, Upload, MessageSquarePlus, ArrowRight, BookOpen, AlertTriangle, CheckCircle2, Sparkles } from 'lucide-react'
import { toast } from 'sonner'

export default function TrialPage() {
  const [issueTitle, setIssueTitle] = useState('')
  const [issueDescription, setIssueDescription] = useState('')
  const [submitterEmail, setSubmitterEmail] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const handleSubmitIssue = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!issueTitle.trim()) {
      toast.error('Please enter an issue title')
      return
    }

    setSubmitting(true)
    try {
      const response = await fetch('/api/trial/report-issue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: issueTitle,
          description: issueDescription,
          email: submitterEmail,
        }),
      })

      if (!response.ok) throw new Error('Failed to submit')

      setSubmitted(true)
      setIssueTitle('')
      setIssueDescription('')
      setSubmitterEmail('')
      toast.success('Issue reported — thank you!')
      setTimeout(() => setSubmitted(false), 5000)
    } catch (error) {
      toast.error('Failed to submit issue. Please email support@stacksdata.com')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Header */}
      <div className="bg-background border-b">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Image 
              src="/stacks-logo-new.png" 
              alt="Stacks Data" 
              width={140} 
              height={40}
              className="h-10 w-auto"
            />
          </div>
          <Link href="/login">
            <Button>Sign In</Button>
          </Link>
        </div>
      </div>

      {/* Hero */}
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-1.5 rounded-full text-sm font-medium mb-6">
          <Sparkles className="h-4 w-4" />
          Completely Rebuilt for 2026
        </div>
        <h1 className="text-4xl font-bold tracking-tight mb-4">
          Welcome to the P&P-VIS Stacks Data 2026 Trial
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
          You know Stacks. You've been there from the start, helping us shape what compliance 
          data management could be. Now we're back — rebuilt from the ground up — and we can't 
          wait to show you what's new.
        </p>
        <Link href="/login">
          <Button size="lg" className="text-lg px-8">
            Let's Go <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </Link>
      </div>

      {/* What's New */}
      <div className="max-w-4xl mx-auto px-4 pb-12">
        <h2 className="text-2xl font-semibold text-center mb-8">
          What's New
        </h2>
        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center mb-2">
                <FileSpreadsheet className="h-5 w-5 text-primary" />
              </div>
              <CardTitle className="text-lg">Your Data, Migrated</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-base">
                All your historical compliance sheets are here. Same data, dramatically 
                better interface. Find anything in seconds.
              </CardDescription>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center mb-2">
                <Send className="h-5 w-5 text-primary" />
              </div>
              <CardTitle className="text-lg">Streamlined Requests</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-base">
                Sending and responding to requests is now fast and intuitive. 
                No more clunky forms or confusing workflows.
              </CardDescription>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center mb-2">
                <Upload className="h-5 w-5 text-primary" />
              </div>
              <CardTitle className="text-lg">Excel Import</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-base">
                Got HQ 2.1 workbooks lying around? Upload them directly. 
                We'll parse and import everything automatically.
              </CardDescription>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center mb-2">
                <MessageSquarePlus className="h-5 w-5 text-primary" />
              </div>
              <CardTitle className="text-lg">Custom Questions</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-base">
                Need to ask something specific? Create your own questions 
                and include them in any request.
              </CardDescription>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Quick Start Guide */}
      <div className="max-w-4xl mx-auto px-4 pb-12">
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="flex items-center justify-between p-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <BookOpen className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">Quick Start Guide</h3>
                <p className="text-muted-foreground">
                  A quick refresher on how things work in the new Stacks.
                </p>
              </div>
            </div>
            <Link href="/docs/getting-started">
              <Button variant="outline">
                Read Guide <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Known Issues / Report Issue */}
      <div className="max-w-4xl mx-auto px-4 pb-16">
        <Card className="border-amber-200 bg-amber-50/50 dark:bg-amber-950/20 dark:border-amber-900">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <CardTitle className="text-lg">Known Issues & Feedback</CardTitle>
                <CardDescription>
                  This is a trial — your feedback helps us improve. Let us know what's not working.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 mb-6 text-sm">
              <p className="text-muted-foreground">
                <strong>Current known issues:</strong>
              </p>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                <li>Excel import may timeout on very large workbooks (100+ products)</li>
                <li>Dark mode toggle coming soon</li>
                <li>Email notifications may have slight delays</li>
              </ul>
            </div>

            {submitted ? (
              <div className="flex items-center gap-3 p-4 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-900">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                <span className="text-green-700 dark:text-green-400">
                  Thank you! We've received your report and will look into it right away.
                </span>
              </div>
            ) : (
              <form onSubmit={handleSubmitIssue} className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-1 block">
                    What went wrong? <span className="text-red-500">*</span>
                  </label>
                  <Input
                    placeholder="Brief description of the issue"
                    value={issueTitle}
                    onChange={(e) => setIssueTitle(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">
                    Details (optional)
                  </label>
                  <Textarea
                    placeholder="What were you trying to do? What happened instead?"
                    value={issueDescription}
                    onChange={(e) => setIssueDescription(e.target.value)}
                    rows={3}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">
                    Your email (optional)
                  </label>
                  <Input
                    type="email"
                    placeholder="So we can follow up with you"
                    value={submitterEmail}
                    onChange={(e) => setSubmitterEmail(e.target.value)}
                  />
                </div>
                <Button type="submit" variant="outline" disabled={submitting}>
                  {submitting ? 'Submitting...' : 'Report Issue'}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Footer */}
      <div className="border-t bg-background">
        <div className="max-w-4xl mx-auto px-4 py-8 text-center text-sm text-muted-foreground">
          <p>
            Questions? Contact us at{' '}
            <a href="mailto:support@stacksdata.com" className="text-primary hover:underline">
              support@stacksdata.com
            </a>
          </p>
          <p className="mt-2">
            © 2026 Stacks Data. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  )
}
