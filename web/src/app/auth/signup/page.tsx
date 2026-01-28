'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2 } from 'lucide-react'

interface Invitation {
  id: string
  email: string
  company_name: string | null
  company_id: string | null
  request_id: string | null
}

export default function SignupPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-2 text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span>Loading...</span>
        </div>
      </div>
    }>
      <SignupContent />
    </Suspense>
  )
}

function SignupContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token')

  const [invitation, setInvitation] = useState<Invitation | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [signupComplete, setSignupComplete] = useState(false)
  const [formData, setFormData] = useState({
    fullName: '',
    password: '',
    confirmPassword: '',
    companyName: '',
  })

  // Whether the invitation links to an existing company (read-only company name)
  const hasExistingCompany = !!invitation?.company_id

  useEffect(() => {
    async function validateToken() {
      if (!token) {
        setLoading(false)
        return
      }

      const supabase = createClient()
      const { data, error } = await supabase
        .from('invitations')
        .select('*')
        .eq('token', token)
        .is('accepted_at', null)
        .gt('expires_at', new Date().toISOString())
        .single()

      if (error || !data) {
        setLoading(false)
        return
      }

      setInvitation(data)
      setFormData(prev => ({
        ...prev,
        companyName: data.company_name || ''
      }))
      setLoading(false)
    }

    validateToken()
  }, [token])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match')
      return
    }

    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }

    setSubmitting(true)

    try {
      const supabase = createClient()

      // Create auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: invitation!.email,
        password: formData.password,
      })

      if (authError) throw authError

      if (!authData.user) {
        throw new Error('Failed to create user account')
      }

      // Check if the user needs email confirmation
      // If session is null but user exists, Supabase requires email confirmation
      if (!authData.session) {
        // User created but not confirmed — show confirmation message
        // Mark invitation as accepted so we know they completed signup
        await supabase
          .from('invitations')
          .update({ accepted_at: new Date().toISOString() })
          .eq('id', invitation!.id)

        setSignupComplete(true)
        setSubmitting(false)
        return
      }

      // Determine company_id: use existing company or create new one
      let companyId: string

      if (invitation!.company_id) {
        // Link to existing company (trial / admin invite flow)
        companyId = invitation!.company_id
      } else {
        // Create new company (new supplier flow)
        const { data: company, error: companyError } = await supabase
          .from('companies')
          .insert({ name: formData.companyName })
          .select()
          .single()

        if (companyError) throw companyError
        companyId = company.id
      }

      // Create user record
      const { error: userError } = await supabase
        .from('users')
        .insert({
          id: authData.user.id,
          email: invitation!.email,
          full_name: formData.fullName,
          company_id: companyId,
          role: 'company_admin',
        })

      if (userError) throw userError

      // Mark invitation as accepted
      await supabase
        .from('invitations')
        .update({ accepted_at: new Date().toISOString() })
        .eq('id', invitation!.id)

      // Redirect to request/sheet if linked
      if (invitation!.request_id) {
        // Get sheet from request
        const { data: request } = await supabase
          .from('requests')
          .select('sheet_id')
          .eq('id', invitation!.request_id)
          .single()

        if (request) {
          router.push(`/sheets/${request.sheet_id}`)
          return
        }
      }

      router.push('/dashboard')
    } catch (error: any) {
      console.error('Signup error:', error)
      setError(error.message || 'Failed to create account. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-2 text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span>Validating invitation...</span>
        </div>
      </div>
    )
  }

  if (!invitation) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center max-w-md">
          <h1 className="text-2xl font-bold mb-4">Invalid or Expired Invitation</h1>
          <p className="text-muted-foreground mb-4">
            This invitation link is invalid or has expired. Please contact the person who sent you the invitation.
          </p>
          <Button onClick={() => router.push('/login')}>
            Go to Login
          </Button>
        </div>
      </div>
    )
  }

  // Show confirmation message if email verification is required
  if (signupComplete) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <div className="w-full max-w-md space-y-6 text-center">
          <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold">Check Your Email</h1>
          <p className="text-muted-foreground">
            We&apos;ve sent a confirmation link to <strong>{invitation.email}</strong>.
            Please click the link in the email to activate your account.
          </p>
          <p className="text-sm text-muted-foreground">
            Once confirmed, you can <a href="/login" className="text-primary underline">log in here</a>.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-center min-h-screen p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Complete Your Signup</h1>
          <p className="text-muted-foreground mt-2">
            You&apos;ve been invited to join StacksData
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            Email: {invitation.email}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="fullName">
              Full Name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="fullName"
              value={formData.fullName}
              onChange={(e) => setFormData(prev => ({ ...prev, fullName: e.target.value }))}
              required
              disabled={submitting}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="companyName">
              Company Name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="companyName"
              value={formData.companyName}
              onChange={(e) => setFormData(prev => ({ ...prev, companyName: e.target.value }))}
              required
              disabled={submitting || hasExistingCompany}
              readOnly={hasExistingCompany}
              className={hasExistingCompany ? 'bg-muted cursor-not-allowed' : ''}
            />
            {hasExistingCompany && (
              <p className="text-xs text-muted-foreground">
                Company is pre-assigned and cannot be changed.
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">
              Password <span className="text-red-500">*</span>
            </Label>
            <Input
              id="password"
              type="password"
              value={formData.password}
              onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
              required
              minLength={8}
              disabled={submitting}
            />
            <p className="text-xs text-muted-foreground">
              Must be at least 8 characters
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">
              Confirm Password <span className="text-red-500">*</span>
            </Label>
            <Input
              id="confirmPassword"
              type="password"
              value={formData.confirmPassword}
              onChange={(e) => setFormData(prev => ({ ...prev, confirmPassword: e.target.value }))}
              required
              minLength={8}
              disabled={submitting}
            />
          </div>

          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating Account...
              </>
            ) : (
              'Create Account'
            )}
          </Button>
        </form>
      </div>
    </div>
  )
}
