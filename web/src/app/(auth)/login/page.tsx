'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Loader2, ArrowRight, Sparkles } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const supabase = createClient()

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    router.push('/dashboard')
    router.refresh()
  }

  const handleForgotPassword = async () => {
    if (!email) {
      setError('Please enter your email address')
      return
    }

    setLoading(true)
    setError(null)

    const supabase = createClient()

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
    })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    setError(null)
    toast.success('Check your email for a password reset link')
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex">
      {/* Left Panel - Dramatic Visual */}
      <div className="hidden lg:flex lg:w-[55%] relative overflow-hidden bg-gradient-to-br from-emerald-950 via-emerald-900 to-teal-900">
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
          <div
            className="absolute w-[400px] h-[400px] rounded-full opacity-25 blur-2xl"
            style={{
              background: 'radial-gradient(circle, oklch(0.55 0.18 145) 0%, transparent 70%)',
              top: '40%',
              left: '30%',
              animation: 'float-slow 18s ease-in-out infinite',
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

        {/* Floating geometric shapes */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {/* Diamond shapes */}
          <div
            className="absolute w-20 h-20 border border-white/20 rotate-45"
            style={{ top: '15%', left: '20%', animation: 'float-gentle 8s ease-in-out infinite' }}
          />
          <div
            className="absolute w-12 h-12 border border-emerald-400/30 rotate-45"
            style={{ top: '25%', right: '25%', animation: 'float-gentle 10s ease-in-out infinite reverse' }}
          />
          <div
            className="absolute w-8 h-8 bg-emerald-400/10 rotate-45"
            style={{ bottom: '30%', left: '15%', animation: 'float-gentle 12s ease-in-out infinite' }}
          />

          {/* Circles */}
          <div
            className="absolute w-32 h-32 rounded-full border border-white/10"
            style={{ top: '60%', left: '60%', animation: 'float-gentle 15s ease-in-out infinite' }}
          />
          <div
            className="absolute w-6 h-6 rounded-full bg-emerald-300/20"
            style={{ top: '40%', right: '15%', animation: 'pulse-soft 4s ease-in-out infinite' }}
          />
          <div
            className="absolute w-4 h-4 rounded-full bg-teal-300/30"
            style={{ bottom: '25%', right: '30%', animation: 'pulse-soft 5s ease-in-out infinite reverse' }}
          />

          {/* Lines */}
          <div
            className="absolute w-40 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent"
            style={{ top: '35%', left: '10%', transform: 'rotate(-15deg)', animation: 'shimmer-line 6s ease-in-out infinite' }}
          />
          <div
            className="absolute w-60 h-px bg-gradient-to-r from-transparent via-emerald-400/20 to-transparent"
            style={{ bottom: '40%', right: '5%', transform: 'rotate(10deg)', animation: 'shimmer-line 8s ease-in-out infinite reverse' }}
          />
        </div>

        {/* Content overlay */}
        <div className="relative z-10 flex flex-col justify-between p-12 text-white">
          {/* Top - Logo */}
          <div className={`transition-all duration-700 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'}`}>
            <Image
              src="/stacks-data-logo-dark.png"
              alt="Stacks Data"
              width={450}
              height={175}
              className="h-36 w-auto"
            />
          </div>

          {/* Center - Hero text */}
          <div className="space-y-8 max-w-lg">
            <div className={`transition-all duration-700 delay-200 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/10 text-sm mb-6">
                <Sparkles className="h-4 w-4 text-emerald-300" />
                <span className="text-emerald-100">Supply Chain Compliance, Simplified</span>
              </div>
              <h1 className="font-display text-5xl font-semibold leading-tight tracking-tight">
                The future of
                <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-200 via-teal-200 to-cyan-200">
                  compliance data
                </span>
                <br />
                management
              </h1>
            </div>
            <p className={`text-lg text-emerald-100/80 leading-relaxed transition-all duration-700 delay-300 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
              Streamline your supplier questionnaires, track compliance status, and collaborate seamlessly with your supply chain partners.
            </p>
          </div>

          {/* Bottom - Stats or testimonial */}
          <div className={`flex items-center gap-12 transition-all duration-700 delay-500 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <div>
              <div className="text-3xl font-semibold text-white">100+</div>
              <div className="text-sm text-emerald-200/70">Companies trust us</div>
            </div>
            <div className="w-px h-12 bg-white/20" />
            <div>
              <div className="text-3xl font-semibold text-white">1.5K+</div>
              <div className="text-sm text-emerald-200/70">Sheets managed</div>
            </div>
            <div className="w-px h-12 bg-white/20" />
            <div>
              <div className="text-3xl font-semibold text-white">99.9%</div>
              <div className="text-sm text-emerald-200/70">Uptime</div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-12 bg-gradient-to-br from-gray-50 to-gray-100/50 relative overflow-hidden">
        {/* Subtle background pattern */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, currentColor 1px, transparent 1px)`,
            backgroundSize: '32px 32px',
          }}
        />

        {/* Mobile logo */}
        <div className="lg:hidden absolute top-6 left-6">
          <Image
            src="/stacks-data-logo-light.png"
            alt="Stacks Data"
            width={280}
            height={80}
            className="h-20 w-auto"
          />
        </div>

        <div className={`w-full max-w-md relative z-10 transition-all duration-700 delay-100 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          {/* Glassmorphism card */}
          <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl shadow-emerald-900/5 border border-white/50 p-8 sm:p-10">
            <div className="text-center mb-8">
              <h2 className="font-display text-3xl font-semibold text-gray-900 mb-2">
                Welcome back
              </h2>
              <p className="text-gray-500">
                Sign in to continue to your dashboard
              </p>
            </div>

            <form onSubmit={handleLogin} className="space-y-5">
              {error && (
                <div className="p-4 text-sm text-red-700 bg-red-50 border border-red-100 rounded-xl animate-in slide-in-from-top-2 duration-200">
                  {error}
                </div>
              )}

              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-medium text-gray-700">
                  Email address
                </label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  className="h-12 bg-white border-gray-200 rounded-xl text-base placeholder:text-gray-400 focus:border-emerald-500 focus:ring-emerald-500/20 transition-all"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label htmlFor="password" className="text-sm font-medium text-gray-700">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={handleForgotPassword}
                    className="text-sm text-emerald-600 hover:text-emerald-700 font-medium transition-colors"
                  >
                    Forgot password?
                  </button>
                </div>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
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
                    Signing in...
                  </>
                ) : (
                  <>
                    Sign in
                    <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
                  </>
                )}
              </Button>
            </form>

            <div className="mt-8 pt-6 border-t border-gray-100">
              <p className="text-center text-sm text-gray-500">
                Don&apos;t have an account?{' '}
                <a
                  href="mailto:support@stacksdata.com"
                  className="text-emerald-600 hover:text-emerald-700 font-semibold transition-colors"
                >
                  Contact us
                </a>
              </p>
            </div>
          </div>

          {/* Footer */}
          <p className="text-center text-xs text-gray-400 mt-8">
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

        @keyframes float-gentle {
          0%, 100% { transform: translateY(0) rotate(45deg); }
          50% { transform: translateY(-20px) rotate(45deg); }
        }

        @keyframes pulse-soft {
          0%, 100% { opacity: 0.2; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(1.2); }
        }

        @keyframes shimmer-line {
          0%, 100% { opacity: 0.1; }
          50% { opacity: 0.3; }
        }
      `}</style>
    </div>
  )
}
