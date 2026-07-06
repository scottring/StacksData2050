'use client'

import {
  Upload,
  FileSpreadsheet,
  Sparkles,
  ScanText,
  CheckCircle2,
  XCircle,
} from 'lucide-react'

const STEPS = [
  { key: 'upload', label: 'Upload', icon: Upload },
  { key: 'prepare', label: 'Prepare', icon: FileSpreadsheet },
  { key: 'extract', label: 'Extract', icon: Sparkles },
  { key: 'map', label: 'Map', icon: ScanText },
  { key: 'complete', label: 'Complete', icon: CheckCircle2 },
]

interface ProcessingStepperProps {
  currentStep: number
  status: 'processing' | 'complete' | 'error'
  error?: string
  message?: string
}

function SpinnerRing({ size, className }: { size: number; className?: string }) {
  const r = (size - 4) / 2
  const circumference = 2 * Math.PI * r
  return (
    <svg
      width={size}
      height={size}
      className={`absolute inset-0 m-auto animate-spin ${className || ''}`}
      style={{ animationDuration: '1.2s' }}
    >
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="currentColor"
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeDasharray={`${circumference * 0.3} ${circumference * 0.7}`}
      />
    </svg>
  )
}

export default function ProcessingStepper({
  currentStep,
  status,
  error,
  message,
}: ProcessingStepperProps) {
  return (
    <div className="py-8 px-4">
      {/* Steps */}
      <div className="flex items-center justify-between">
        {STEPS.map((step, index) => {
          const isComplete = status === 'complete' ? true : index < currentStep
          const isActive = status === 'processing' && index === currentStep
          const isError = status === 'error' && index === currentStep
          const isPending = !isComplete && !isActive && !isError

          const StepIcon = step.icon

          return (
            <div key={step.key} className="flex items-center flex-1 last:flex-none">
              {/* Step circle + label */}
              <div className="flex flex-col items-center">
                <div
                  className={`
                    relative flex items-center justify-center rounded-full transition-all duration-500 ease-out
                    ${isComplete
                      ? 'h-11 w-11 bg-emerald-500 shadow-md shadow-emerald-500/20'
                      : isActive
                        ? 'h-14 w-14 bg-emerald-50'
                        : isError
                          ? 'h-14 w-14 bg-red-50 ring-2 ring-red-400/30'
                          : 'h-11 w-11 bg-slate-100'
                    }
                  `}
                >
                  {/* Spinning border ring for active step */}
                  {isActive && (
                    <SpinnerRing size={56} className="text-emerald-500" />
                  )}

                  {/* Static background ring for active (behind spinner) */}
                  {isActive && (
                    <div className="absolute inset-0 rounded-full ring-2 ring-emerald-500/15" />
                  )}

                  {isComplete ? (
                    <CheckCircle2 className="h-5 w-5 text-white" />
                  ) : isError ? (
                    <XCircle className="h-7 w-7 text-red-500" />
                  ) : isActive ? (
                    <StepIcon className="h-7 w-7 text-emerald-600" />
                  ) : (
                    <StepIcon className={`h-5 w-5 ${isPending ? 'text-slate-400' : 'text-slate-500'}`} />
                  )}
                </div>

                {/* Label */}
                <span
                  className={`
                    mt-2.5 text-xs font-medium tracking-wide uppercase transition-colors duration-300
                    ${isComplete
                      ? 'text-emerald-600'
                      : isActive
                        ? 'text-emerald-700'
                        : isError
                          ? 'text-red-600'
                          : 'text-slate-400'
                    }
                  `}
                >
                  {step.label}
                </span>
              </div>

              {/* Connector line */}
              {index < STEPS.length - 1 && (
                <div className="flex-1 mx-3 mb-6">
                  <div
                    className={`
                      h-[2px] w-full transition-all duration-500
                      ${isComplete
                        ? 'bg-emerald-400'
                        : isActive
                          ? 'bg-linear-to-r from-emerald-400 to-slate-200'
                          : 'bg-slate-200'
                      }
                    `}
                  />
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Status message */}
      <div className="mt-6 text-center min-h-[24px]">
        {status === 'processing' && message && (
          <p className="text-sm text-slate-500 animate-pulse">{message}</p>
        )}
        {status === 'complete' && (
          <p className="text-sm text-emerald-600 font-medium">Extraction complete</p>
        )}
        {status === 'error' && error && (
          <p className="text-sm text-red-600">{error}</p>
        )}
      </div>
    </div>
  )
}
