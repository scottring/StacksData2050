'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Loader2, ArrowRight, Sparkles, CheckCircle2, Star } from 'lucide-react'
import { trackFollowUpCompleted } from '@/lib/trial-tracking'

export default function FollowUpPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-50 to-gray-100/50">
        <div className="flex flex-col items-center gap-2 text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
          <span>Loading...</span>
        </div>
      </div>
    }>
      <FollowUpContent />
    </Suspense>
  )
}

const FOLLOW_UP_QUESTIONS = [
  {
    id: 'platform_experience',
    label: 'How has your experience with the platform been so far?',
    placeholder: 'Share your overall impressions...',
  },
  {
    id: 'biggest_surprise',
    label: "What's been the biggest surprise (positive or negative) during your trial?",
    placeholder: 'Tell us what stood out to you...',
  },
  {
    id: 'remaining_questions',
    label: 'What questions do you still have after using the platform?',
    placeholder: 'What would you like to know more about...',
  },
]

function FollowUpContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const email = searchParams.get('email')
  const token = searchParams.get('token')

  const [mounted, setMounted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')
  const [formData, setFormData] = useState({
    platform_experience: '',
    biggest_surprise: '',
    remaining_questions: '',
    likelihood_to_recommend: 0,
  })

  useEffect(() => {
    setMounted(true)
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (!email) {
      setError('Email is required')
      return
    }

    if (formData.likelihood_to_recommend === 0) {
      setError('Please select a rating')
      return
    }

    setLoading(true)

    try {
      const response = await fetch('/api/trial/discovery/follow-up', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          token,
          ...formData,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit. Please try again.')
      }

      // Track follow-up completion
      if (email) {
        trackFollowUpCompleted(email)
      }

      setSubmitted(true)
    } catch (error: any) {
      console.error('Follow-up submission error:', error)
      setError(error.message || 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // Success state
  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100/50 p-6">
        <div className="max-w-md text-center">
          <div className="mx-auto w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center mb-6">
            <CheckCircle2 className="h-10 w-10 text-emerald-600" />
          </div>
          <h1 className="text-2xl font-semibold text-gray-900 mb-3">
            Thank you for your feedback!
          </h1>
          <p className="text-gray-500 mb-6">
            Your responses help us improve the Stacks Data experience for everyone.
          </p>
          <Button onClick={() => router.push('/dashboard')}>
            Go to Dashboard
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex">
      {/* Left Panel */}
      <div className="hidden lg:flex lg:w-[40%] relative overflow-hidden bg-gradient-to-br from-emerald-950 via-emerald-900 to-teal-900">
        {/* Animated gradient orbs */}
        <div className="absolute inset-0 overflow-hidden">
          <div
            className="absolute w-[600px] h-[600px] rounded-full opacity-30 blur-3xl"
            style={{
              background: 'radial-gradient(circle, oklch(0.5 0.2 160) 0%, transparent 70%)',
              top: '-10%',
              left: '-10%',
              animation: 'float-slow 20s ease-in-out infinite',
            }}
          />
        </div>

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-between p-12 text-white">
          <div>
            <Image
              src="/stacks-data-logo-dark.png"
              alt="Stacks Data"
              width={300}
              height={120}
              className="h-24 w-auto"
            />
          </div>

          <div className="space-y-6 max-w-sm">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/10 text-sm">
              <Sparkles className="h-4 w-4 text-emerald-300" />
              <span className="text-emerald-100">Trial Follow-up</span>
            </div>
            <h1 className="font-display text-3xl font-semibold leading-tight">
              How&apos;s your
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-200 to-teal-200">
                trial going?
              </span>
            </h1>
            <p className="text-emerald-100/80">
              We&apos;d love to hear about your experience so far. Your feedback helps us make Stacks Data better for everyone.
            </p>
          </div>

          <div className="text-sm text-emerald-200/60">
            © 2026 Stacks Data
          </div>
        </div>
      </div>

      {/* Right Panel - Form */}
      <div className="flex-1 flex flex-col bg-gradient-to-br from-gray-50 to-gray-100/50">
        {/* Mobile logo */}
        <div className="lg:hidden p-6 pb-0">
          <Image
            src="/stacks-data-logo-light.png"
            alt="Stacks Data"
            width={180}
            height={54}
            className="h-12 w-auto"
          />
        </div>

        {/* Form */}
        <div className="flex-1 overflow-y-auto px-6 py-8 sm:px-12">
          <div className={`w-full max-w-xl mx-auto transition-all duration-700 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <div className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-2">
                Quick Follow-up
              </h2>
              <p className="text-gray-500">
                A few questions about your trial experience so far.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="p-4 text-sm text-red-700 bg-red-50 border border-red-100 rounded-xl">
                  {error}
                </div>
              )}

              {/* Questions */}
              {FOLLOW_UP_QUESTIONS.map((question, index) => {
                const value = formData[question.id as keyof typeof formData] as string
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
                  </div>
                )
              })}

              {/* NPS Rating */}
              <div className="space-y-3">
                <Label className="text-sm font-medium text-gray-700 flex items-start gap-2">
                  <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 text-xs font-semibold flex-shrink-0">
                    4
                  </span>
                  <span>How likely would you be to recommend this trial to a colleague?</span>
                </Label>
                <div className="flex items-center justify-between gap-1 sm:gap-2">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((rating) => (
                    <button
                      key={rating}
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, likelihood_to_recommend: rating }))}
                      disabled={loading}
                      className={`flex-1 py-3 rounded-lg text-sm font-medium transition-all ${
                        formData.likelihood_to_recommend === rating
                          ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/30 scale-105'
                          : 'bg-white border border-gray-200 text-gray-700 hover:border-emerald-300 hover:bg-emerald-50'
                      }`}
                    >
                      {rating}
                    </button>
                  ))}
                </div>
                <div className="flex justify-between text-xs text-gray-400 px-1">
                  <span>Not likely</span>
                  <span>Very likely</span>
                </div>
              </div>

              {/* Submit */}
              <div className="pt-4">
                <Button
                  type="submit"
                  className="w-full h-12 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-semibold rounded-xl shadow-lg shadow-emerald-600/25 hover:shadow-emerald-600/40 transition-all duration-300 group"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      Submit Feedback
                      <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
                    </>
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* Animations */}
      <style jsx global>{`
        @keyframes float-slow {
          0%, 100% { transform: translate(0, 0); }
          50% { transform: translate(30px, -30px); }
        }
      `}</style>
    </div>
  )
}
