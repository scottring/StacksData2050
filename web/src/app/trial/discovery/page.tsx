'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Loader2, ArrowRight, Sparkles, CheckCircle2 } from 'lucide-react'

export default function DiscoveryPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-50 to-gray-100/50">
        <div className="flex flex-col items-center gap-2 text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
          <span>Loading...</span>
        </div>
      </div>
    }>
      <DiscoveryContent />
    </Suspense>
  )
}

const QUESTIONS = [
  {
    id: 'motivation_interest',
    label: 'What makes you interested in trying this trial and participating in it?',
    placeholder: 'Share what drew you to explore this platform...',
  },
  {
    id: 'learning_goals',
    label: 'What do you hope to learn from your participation in this trial?',
    placeholder: 'Describe what you want to discover or understand...',
  },
  {
    id: 'success_definition',
    label: 'What would you consider to be a successful outcome of this trial for your organization?',
    placeholder: 'Tell us what success looks like for you...',
  },
  {
    id: 'impact_measurement',
    label: 'How would you know if this platform could meaningfully impact your work?',
    placeholder: 'What indicators would show this is valuable...',
  },
  {
    id: 'concerns_questions',
    label: 'What questions or concerns do you have going into this trial?',
    placeholder: 'Share any uncertainties or things you want clarified...',
  },
]

function DiscoveryContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token')
  const prefilledEmail = searchParams.get('email')

  const [mounted, setMounted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [formData, setFormData] = useState({
    email: prefilledEmail || '',
    company_name: '',
    motivation_interest: '',
    learning_goals: '',
    success_definition: '',
    impact_measurement: '',
    concerns_questions: '',
  })

  useEffect(() => {
    setMounted(true)
  }, [])

  // Calculate progress based on filled questions
  const filledQuestions = QUESTIONS.filter(q => formData[q.id as keyof typeof formData].trim().length > 0).length
  const progress = (filledQuestions / QUESTIONS.length) * 100

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (!formData.email) {
      setError('Please enter your email address')
      return
    }

    // Validate at least one question is answered
    const hasAnswer = QUESTIONS.some(q => formData[q.id as keyof typeof formData].trim().length > 0)
    if (!hasAnswer) {
      setError('Please answer at least one question to continue')
      return
    }

    setLoading(true)

    try {
      const response = await fetch('/api/trial/discovery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          token,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit. Please try again.')
      }

      // Redirect to signup with token
      router.push(data.redirect_url || `/auth/signup?token=${token}`)
    } catch (error: any) {
      console.error('Discovery submission error:', error)
      setError(error.message || 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* Left Panel - Dramatic Visual */}
      <div className="hidden lg:flex lg:w-[45%] relative overflow-hidden bg-gradient-to-br from-emerald-950 via-emerald-900 to-teal-900">
        {/* Animated gradient orbs */}
        <div className="absolute inset-0 overflow-hidden">
          <div
            className="absolute w-[800px] h-[800px] rounded-full opacity-30 blur-3xl"
            style={{
              background: 'radial-gradient(circle, oklch(0.5 0.2 160) 0%, transparent 70%)',
              top: '-20%',
              left: '-20%',
              animation: 'float-slow 20s ease-in-out infinite',
            }}
          />
          <div
            className="absolute w-[600px] h-[600px] rounded-full opacity-20 blur-3xl"
            style={{
              background: 'radial-gradient(circle, oklch(0.6 0.15 180) 0%, transparent 70%)',
              bottom: '-10%',
              right: '-10%',
              animation: 'float-slow 25s ease-in-out infinite reverse',
            }}
          />
        </div>

        {/* Geometric grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage: `
              linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)
            `,
            backgroundSize: '60px 60px',
          }}
        />

        {/* Content overlay */}
        <div className="relative z-10 flex flex-col justify-between p-12 text-white">
          {/* Top - Logo */}
          <div className={`transition-all duration-700 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'}`}>
            <Image
              src="/stacks-data-logo-dark.png"
              alt="Stacks Data"
              width={350}
              height={140}
              className="h-28 w-auto"
            />
          </div>

          {/* Center - Hero text */}
          <div className="space-y-8 max-w-md">
            <div className={`transition-all duration-700 delay-200 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/10 text-sm mb-6">
                <Sparkles className="h-4 w-4 text-emerald-300" />
                <span className="text-emerald-100">PPvis Member Trial</span>
              </div>
              <h1 className="font-display text-4xl font-semibold leading-tight tracking-tight">
                Help us tailor
                <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-200 via-teal-200 to-cyan-200">
                  your experience
                </span>
              </h1>
            </div>
            <p className={`text-lg text-emerald-100/80 leading-relaxed transition-all duration-700 delay-300 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
              Before diving in, share what you&apos;re hoping to get from this trial. Your answers help us ensure you get the most value.
            </p>
          </div>

          {/* Bottom - Benefits */}
          <div className={`space-y-4 transition-all duration-700 delay-500 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 text-emerald-400" />
              <span className="text-emerald-100/90">5-day full access trial</span>
            </div>
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 text-emerald-400" />
              <span className="text-emerald-100/90">Personalized onboarding support</span>
            </div>
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 text-emerald-400" />
              <span className="text-emerald-100/90">No credit card required</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel - Discovery Form */}
      <div className="flex-1 flex flex-col bg-gradient-to-br from-gray-50 to-gray-100/50 relative overflow-hidden">
        {/* Subtle background pattern */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, currentColor 1px, transparent 1px)`,
            backgroundSize: '32px 32px',
          }}
        />

        {/* Mobile logo */}
        <div className="lg:hidden p-6 pb-0">
          <Image
            src="/stacks-data-logo-light.png"
            alt="Stacks Data"
            width={200}
            height={60}
            className="h-14 w-auto"
          />
        </div>

        {/* Scrollable form area */}
        <div className="flex-1 overflow-y-auto px-6 py-8 sm:px-12">
          <div className={`w-full max-w-2xl mx-auto relative z-10 transition-all duration-700 delay-100 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            {/* Header */}
            <div className="mb-8">
              <h2 className="font-display text-2xl sm:text-3xl font-semibold text-gray-900 mb-2">
                Welcome to the Stacks Data Trial!
              </h2>
              <p className="text-gray-500">
                Before you explore the platform, share a few thoughts to help us tailor your experience.
              </p>
            </div>

            {/* Progress bar */}
            <div className="mb-8">
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="text-gray-500">{filledQuestions} of {QUESTIONS.length} questions answered</span>
                <span className="text-emerald-600 font-medium">{Math.round(progress)}%</span>
              </div>
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="p-4 text-sm text-red-700 bg-red-50 border border-red-100 rounded-xl animate-in slide-in-from-top-2 duration-200">
                  {error}
                </div>
              )}

              {/* Email and Company */}
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-medium text-gray-700">
                    Email address <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@company.com"
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    required
                    disabled={loading}
                    className="h-11 bg-white border-gray-200 rounded-xl focus:border-emerald-500 focus:ring-emerald-500/20"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="company_name" className="text-sm font-medium text-gray-700">
                    Company name <span className="text-gray-400">(optional)</span>
                  </Label>
                  <Input
                    id="company_name"
                    type="text"
                    placeholder="Your company"
                    value={formData.company_name}
                    onChange={(e) => setFormData(prev => ({ ...prev, company_name: e.target.value }))}
                    disabled={loading}
                    className="h-11 bg-white border-gray-200 rounded-xl focus:border-emerald-500 focus:ring-emerald-500/20"
                  />
                </div>
              </div>

              {/* Discovery Questions */}
              <div className="space-y-6 pt-4">
                {QUESTIONS.map((question, index) => {
                  const value = formData[question.id as keyof typeof formData]
                  const charCount = value.length

                  return (
                    <div key={question.id} className="space-y-2">
                      <Label htmlFor={question.id} className="text-sm font-medium text-gray-700 flex items-start gap-2">
                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 text-xs font-semibold flex-shrink-0">
                          {index + 1}
                        </span>
                        <span>{question.label}</span>
                      </Label>
                      <Textarea
                        id={question.id}
                        placeholder={question.placeholder}
                        value={value}
                        onChange={(e) => setFormData(prev => ({ ...prev, [question.id]: e.target.value }))}
                        disabled={loading}
                        rows={3}
                        maxLength={1000}
                        className="bg-white border-gray-200 rounded-xl resize-none focus:border-emerald-500 focus:ring-emerald-500/20"
                      />
                      <div className="flex justify-end">
                        <span className={`text-xs ${charCount > 800 ? 'text-amber-600' : 'text-gray-400'}`}>
                          {charCount}/1000
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Submit Button */}
              <div className="pt-4">
                <Button
                  type="submit"
                  className="w-full h-12 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-semibold rounded-xl shadow-lg shadow-emerald-600/25 hover:shadow-emerald-600/40 transition-all duration-300 text-base group"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      Start My Trial Experience
                      <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
                    </>
                  )}
                </Button>
              </div>

              <p className="text-center text-xs text-gray-400">
                Your responses help us understand your needs and improve the trial experience.
              </p>
            </form>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 text-center border-t border-gray-100 bg-white/50">
          <p className="text-xs text-gray-400">
            © 2026 Stacks Data. All rights reserved.
          </p>
        </div>
      </div>

      {/* Global styles for animations */}
      <style jsx global>{`
        @keyframes float-slow {
          0%, 100% { transform: translate(0, 0) rotate(0deg); }
          33% { transform: translate(30px, -30px) rotate(5deg); }
          66% { transform: translate(-20px, 20px) rotate(-5deg); }
        }
      `}</style>
    </div>
  )
}
