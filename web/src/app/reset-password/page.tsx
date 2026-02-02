'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Loader2, ArrowRight, CheckCircle, KeyRound } from 'lucide-react'
import { toast } from 'sonner'

export default function ResetPasswordPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [sessionReady, setSessionReady] = useState(false)
  const [checkingSession, setCheckingSession] = useState(true)

  useEffect(() => {
    setMounted(true)

    const supabase = createClient()

    const initSession = async () => {
      // First check if we already have a session
      const { data: { session: existingSession } } = await supabase.auth.getSession()

      if (existingSession) {
        console.log('Existing session found')
        setSessionReady(true)
        setCheckingSession(false)
        return
      }

      // Check for tokens in URL hash (Supabase recovery flow puts them there)
      const hash = window.location.hash
      console.log('URL hash:', hash)

      if (hash && hash.includes('access_token')) {
        // Parse hash parameters
        const hashParams = new URLSearchParams(hash.substring(1))
        const accessToken = hashParams.get('access_token')
        const refreshToken = hashParams.get('refresh_token')
        const type = hashParams.get('type')

        console.log('Found tokens in hash, type:', type)

        if (accessToken && refreshToken) {
          // Manually set the session with the tokens from the URL
          const { data, error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          })

          if (error) {
            console.error('Error setting session:', error)
            setCheckingSession(false)
            return
          }

          if (data.session) {
            console.log('Session established from hash tokens')
            // Clear the hash from URL for cleaner appearance
            window.history.replaceState(null, '', window.location.pathname)
            setSessionReady(true)
            setCheckingSession(false)
            return
          }
        }
      }

      // No session and no valid hash tokens
      console.log('No session found')
      setCheckingSession(false)
    }

    initSession()
  }, [])

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    setLoading(true)

    const supabase = createClient()

    const { error } = await supabase.auth.updateUser({
      password: password
    })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    setSuccess(true)
    toast.success('Password updated successfully')

    // Redirect to dashboard after a moment
    setTimeout(() => {
      router.push('/dashboard')
    }, 2000)
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-br from-gray-50 to-gray-100/50 relative overflow-hidden">
      {/* Subtle background pattern */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, currentColor 1px, transparent 1px)`,
          backgroundSize: '32px 32px',
        }}
      />

      {/* Logo */}
      <div className="absolute top-6 left-6">
        <Image
          src="/stacks-data-logo-light.png"
          alt="Stacks Data"
          width={280}
          height={80}
          className="h-16 w-auto"
        />
      </div>

      <div className={`w-full max-w-md relative z-10 transition-all duration-700 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
        {/* Glassmorphism card */}
        <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl shadow-emerald-900/5 border border-white/50 p-8 sm:p-10">
          {success ? (
            <div className="text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto">
                <CheckCircle className="h-8 w-8 text-emerald-600" />
              </div>
              <h2 className="font-display text-2xl font-semibold text-gray-900">
                Password Updated
              </h2>
              <p className="text-gray-500">
                Your password has been successfully changed. Redirecting to dashboard...
              </p>
            </div>
          ) : (
            <>
              <div className="text-center mb-8">
                <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
                  <KeyRound className="h-8 w-8 text-emerald-600" />
                </div>
                <h2 className="font-display text-3xl font-semibold text-gray-900 mb-2">
                  Set New Password
                </h2>
                <p className="text-gray-500">
                  Enter your new password below
                </p>
              </div>

              {checkingSession ? (
                <div className="flex flex-col items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-emerald-600 mb-4" />
                  <p className="text-gray-500">Verifying your session...</p>
                </div>
              ) : !sessionReady ? (
                <div className="p-4 text-sm text-amber-700 bg-amber-50 border border-amber-100 rounded-xl">
                  <p className="font-medium mb-2">Session expired or invalid</p>
                  <p className="text-amber-600">
                    The password reset link may have expired. Please request a new one from the login page.
                  </p>
                  <Button
                    variant="outline"
                    className="w-full mt-4"
                    onClick={() => router.push('/login')}
                  >
                    Go to Login
                  </Button>
                </div>
              ) : (
              <form onSubmit={handleReset} className="space-y-5">
                {error && (
                  <div className="p-4 text-sm text-red-700 bg-red-50 border border-red-100 rounded-xl animate-in slide-in-from-top-2 duration-200">
                    {error}
                  </div>
                )}

                <div className="space-y-2">
                  <label htmlFor="password" className="text-sm font-medium text-gray-700">
                    New Password
                  </label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={8}
                    autoComplete="new-password"
                    className="h-12 bg-white border-gray-200 rounded-xl text-base placeholder:text-gray-400 focus:border-emerald-500 focus:ring-emerald-500/20 transition-all"
                  />
                  <p className="text-xs text-gray-500">Must be at least 8 characters</p>
                </div>

                <div className="space-y-2">
                  <label htmlFor="confirmPassword" className="text-sm font-medium text-gray-700">
                    Confirm Password
                  </label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    autoComplete="new-password"
                    className="h-12 bg-white border-gray-200 rounded-xl text-base placeholder:text-gray-400 focus:border-emerald-500 focus:ring-emerald-500/20 transition-all"
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full h-12 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-semibold rounded-xl shadow-lg shadow-emerald-600/25 hover:shadow-emerald-600/40 transition-all duration-300 text-base group"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    <>
                      Update Password
                      <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
                    </>
                  )}
                </Button>
              </form>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-gray-400 mt-8">
          © 2026 Stacks Data. All rights reserved.
        </p>
      </div>
    </div>
  )
}
