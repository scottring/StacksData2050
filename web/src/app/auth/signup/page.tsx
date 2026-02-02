'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, CheckCircle, Mail } from 'lucide-react'
import { toast } from 'sonner'

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
  const [userAlreadyExists, setUserAlreadyExists] = useState(false)
  const [detectedBeforeForm, setDetectedBeforeForm] = useState(false) // True if detected before showing form
  const [resetEmailSent, setResetEmailSent] = useState(false)
  const [sendingReset, setSendingReset] = useState(false)
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

      // Check if user already exists in auth BEFORE showing the form
      try {
        const checkResponse = await fetch('/api/auth/check-user', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: data.email })
        })
        const checkResult = await checkResponse.json()

        if (checkResult.exists) {
          setUserAlreadyExists(true)
          setDetectedBeforeForm(true) // User was detected before they saw the form
        }
      } catch (e) {
        // If check fails, continue with normal signup flow
        console.error('Error checking user:', e)
      }

      setLoading(false)
    }

    validateToken()
  }, [token])

  // For existing users detected BEFORE the form, automatically send password reset via SendGrid
  // (passwords from old Bubble system didn't migrate to Supabase Auth)
  // Only auto-send if detected before form - not if signup failed with "user exists"
  useEffect(() => {
    async function autoSendReset() {
      if (detectedBeforeForm && userAlreadyExists && !resetEmailSent && !sendingReset && invitation?.email) {
        setSendingReset(true)
        try {
          const response = await fetch('/api/auth/send-reset-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: invitation.email,
              redirectTo: `${window.location.origin}/reset-password`,
            }),
          })
          if (response.ok) {
            setResetEmailSent(true)
          }
        } catch (e) {
          console.error('Auto reset email failed:', e)
        } finally {
          setSendingReset(false)
        }
      }
    }
    autoSendReset()
  }, [detectedBeforeForm, userAlreadyExists, resetEmailSent, sendingReset, invitation?.email])

  async function handleSendResetEmail() {
    if (!invitation?.email) return

    setSendingReset(true)

    try {
      const response = await fetch('/api/auth/send-reset-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: invitation.email,
          redirectTo: `${window.location.origin}/reset-password`,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to send email')
      }

      setResetEmailSent(true)
      toast.success('Password setup email sent!')
    } catch (error: any) {
      toast.error(error.message || 'Failed to send email')
    } finally {
      setSendingReset(false)
    }
  }

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
      if (!authData.session) {
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
        companyId = invitation!.company_id
      } else {
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
      const errorMsg = error.message?.toLowerCase() || ''
      if (errorMsg.includes('already registered') || errorMsg.includes('already exists') || errorMsg.includes('user already')) {
        setUserAlreadyExists(true)
      } else {
        setError(error.message || 'Failed to create account. Please try again.')
      }
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
            <CheckCircle className="w-8 h-8 text-green-600" />
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

  // Show "Welcome back" flow if user already has an account
  if (userAlreadyExists) {
    // If signup failed (not detected before form), show error with options
    if (!detectedBeforeForm && !resetEmailSent) {
      return (
        <div className="flex items-center justify-center min-h-screen p-4">
          <div className="w-full max-w-md space-y-6 text-center">
            <div className="mx-auto w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center">
              <Mail className="w-8 h-8 text-amber-600" />
            </div>
            <h1 className="text-2xl font-bold">Account Already Exists</h1>
            <p className="text-muted-foreground">
              An account with <strong>{invitation.email}</strong> already exists in our system.
            </p>
            <p className="text-sm text-muted-foreground">
              You can log in with your existing password, or reset it if you&apos;ve forgotten it.
            </p>
            <div className="pt-4 space-y-3">
              <Button
                className="w-full"
                onClick={() => router.push('/login')}
              >
                Go to Login
              </Button>
              <Button
                variant="outline"
                className="w-full"
                onClick={handleSendResetEmail}
                disabled={sendingReset}
              >
                {sendingReset ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  'Reset My Password'
                )}
              </Button>
            </div>
          </div>
        </div>
      )
    }

    // Show message that reset email was/is being sent (detected before form)
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <div className="w-full max-w-md space-y-6 text-center">
          {sendingReset ? (
            <>
              <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
              </div>
              <h1 className="text-2xl font-bold">Setting Up Your Account...</h1>
              <p className="text-muted-foreground">
                We&apos;re sending you an email to set your password.
              </p>
            </>
          ) : resetEmailSent ? (
            <>
              <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                <Mail className="w-8 h-8 text-green-600" />
              </div>
              <h1 className="text-2xl font-bold">Check Your Email</h1>
              <p className="text-muted-foreground">
                We&apos;ve just sent a <strong>new email</strong> to <strong>{invitation.email}</strong>.
              </p>
              <div className="mt-4 p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-left">
                <p className="text-sm font-medium text-emerald-800">Look for an email with subject:</p>
                <p className="text-sm text-emerald-700 mt-1">&quot;Set Up Your Stacks Data Password&quot;</p>
              </div>
              <p className="text-sm text-muted-foreground mt-4">
                Click the &quot;Set My Password&quot; button in that email to create your password.
              </p>
              <div className="pt-4 space-y-3">
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={handleSendResetEmail}
                  disabled={sendingReset}
                >
                  Resend Email
                </Button>
                <p className="text-xs text-muted-foreground">
                  Didn&apos;t receive it? Check your spam folder or click above to resend.
                </p>
              </div>
            </>
          ) : (
            <>
              <div className="mx-auto w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center">
                <Mail className="w-8 h-8 text-amber-600" />
              </div>
              <h1 className="text-2xl font-bold">Welcome Back!</h1>
              <p className="text-muted-foreground">
                An account with <strong>{invitation.email}</strong> already exists.
              </p>
              <Button
                className="w-full mt-4"
                onClick={handleSendResetEmail}
                disabled={sendingReset}
              >
                Send Password Setup Email
              </Button>
            </>
          )}
        </div>
      </div>
    )
  }

  // Normal signup form for new users
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
