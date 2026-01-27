import { ComplianceStatusDashboard } from '@/components/dashboard/compliance-status-dashboard'
import { CASLookup } from '@/components/sheets/cas-lookup'
import { AppLayout } from '@/components/layout/app-layout'
import { fetchComplianceStats } from '@/lib/compliance-stats'

export default async function ComplianceDemoPage() {
  // Fetch real compliance statistics from Supabase
  const stats = await fetchComplianceStats()
  return (
    <AppLayout title="Compliance Intelligence">
      <div className="space-y-12 pb-12">
        {/* Hero Section */}
        <div className="relative">
          <div className="absolute inset-0 bg-linear-to-r from-emerald-500/5 via-blue-500/5 to-violet-500/5 blur-3xl -z-10" />
          <div className="space-y-4">
            <h1 className="text-4xl font-bold tracking-tight bg-linear-to-r from-neutral-900 via-neutral-800 to-neutral-700 dark:from-white dark:via-neutral-100 dark:to-neutral-300 bg-clip-text text-transparent">
              Compliance Intelligence Platform
            </h1>
            <p className="text-lg text-neutral-600 dark:text-neutral-400 max-w-3xl">
              Real-time regulatory monitoring, automated chemical validation, and EU Digital Product Passport readiness—all in one sophisticated platform.
            </p>
          </div>
        </div>

        {/* CAS Lookup Section */}
        <div className="space-y-6">
          <div className="space-y-2">
            <h2 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white">
              Chemical Intelligence Lookup
            </h2>
            <p className="text-neutral-600 dark:text-neutral-400">
              Instant CAS number validation with regulatory compliance analysis
            </p>
          </div>
          <CASLookup />
        </div>

        {/* Divider */}
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-neutral-200 dark:border-neutral-800" />
          </div>
          <div className="relative flex justify-center">
            <span className="bg-white dark:bg-neutral-950 px-4 text-sm text-neutral-500">
              Compliance Dashboard
            </span>
          </div>
        </div>

        {/* Compliance Dashboard Section */}
        <div className="space-y-6">
          <div className="space-y-2">
            <h2 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white">
              Supplier Compliance Overview
            </h2>
            <p className="text-neutral-600 dark:text-neutral-400">
              Comprehensive monitoring across your entire supply chain
            </p>
          </div>
          <ComplianceStatusDashboard stats={stats} />
        </div>

        {/* Features Grid */}
        <div className="space-y-6 pt-8 border-t border-neutral-200 dark:border-neutral-800">
          <h2 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white">
            Platform Capabilities
          </h2>
          <div className="grid gap-6 md:grid-cols-3">
            <div className="p-6 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
              <div className="space-y-3">
                <div className="p-3 rounded-lg bg-emerald-100 dark:bg-emerald-950/50 w-fit">
                  <svg className="h-6 w-6 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="font-semibold text-neutral-900 dark:text-white">
                  Automated Validation
                </h3>
                <p className="text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
                  CAS number lookup, regulatory checking, and data completeness validation happen instantly as suppliers enter information.
                </p>
              </div>
            </div>

            <div className="p-6 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
              <div className="space-y-3">
                <div className="p-3 rounded-lg bg-blue-100 dark:bg-blue-950/50 w-fit">
                  <svg className="h-6 w-6 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <h3 className="font-semibold text-neutral-900 dark:text-white">
                  Real-Time Alerts
                </h3>
                <p className="text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
                  Stay ahead of regulatory changes with proactive monitoring of REACH, RoHS, PFAS restrictions, and food contact regulations.
                </p>
              </div>
            </div>

            <div className="p-6 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
              <div className="space-y-3">
                <div className="p-3 rounded-lg bg-violet-100 dark:bg-violet-950/50 w-fit">
                  <svg className="h-6 w-6 text-violet-600 dark:text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" />
                  </svg>
                </div>
                <h3 className="font-semibold text-neutral-900 dark:text-white">
                  DPP Ready
                </h3>
                <p className="text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
                  Collect all required data fields for EU Digital Product Passport compliance by 2027, with automated readiness scoring.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
