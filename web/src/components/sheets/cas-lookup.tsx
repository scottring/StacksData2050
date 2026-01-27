'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Search, CheckCircle2, AlertTriangle, Loader2, Info, ExternalLink, Sparkles } from 'lucide-react'
import { lookupCAS, checkRegulatoryStatus, validateCASChecksum, type ChemicalData, type RegulatoryFlags } from '@/lib/pubchem'

interface CASLookupProps {
  onSelect?: (data: ChemicalData) => void
  className?: string
}

export function CASLookup({ onSelect, className }: CASLookupProps) {
  const [casNumber, setCasNumber] = useState('')
  const [loading, setLoading] = useState(false)
  const [chemicalData, setChemicalData] = useState<ChemicalData | null>(null)
  const [regulatoryFlags, setRegulatoryFlags] = useState<RegulatoryFlags | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleLookup = async () => {
    if (!casNumber.trim()) return

    setLoading(true)
    setError(null)
    setChemicalData(null)
    setRegulatoryFlags(null)

    try {
      if (!validateCASChecksum(casNumber)) {
        setError('Invalid CAS number checksum. Please verify the number.')
        setLoading(false)
        return
      }

      const data = await lookupCAS(casNumber)

      if (!data) {
        setError('Chemical not found in PubChem database. Please verify the CAS number.')
        setLoading(false)
        return
      }

      setChemicalData(data)
      const flags = await checkRegulatoryStatus(data.cas, data.name)
      setRegulatoryFlags(flags)

      if (onSelect) {
        onSelect(data)
      }
    } catch (err) {
      setError('Failed to lookup chemical. Please try again.')
      console.error('CAS lookup error:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleLookup()
    }
  }

  return (
    <div className={className}>
      <div className="space-y-6">
        {/* Header */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-emerald-600" />
            <h3 className="font-semibold text-lg tracking-tight">Chemical Intelligence</h3>
          </div>
          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            Instant validation and regulatory analysis powered by PubChem
          </p>
        </div>

        {/* Search Input - Premium Glass Design */}
        <div className="relative group">
          <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/20 to-blue-500/20 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <div className="relative bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-lg shadow-neutral-900/5 p-6">
            <div className="flex gap-3">
              <div className="flex-1 relative">
                <Input
                  type="text"
                  placeholder="Enter CAS Registry Number"
                  value={casNumber}
                  onChange={(e) => setCasNumber(e.target.value)}
                  onKeyPress={handleKeyPress}
                  className="h-12 px-4 font-mono text-base border-neutral-300 dark:border-neutral-700 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                  disabled={loading}
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-neutral-400">
                  e.g., 50-00-0
                </div>
              </div>
              <Button
                onClick={handleLookup}
                disabled={loading || !casNumber.trim()}
                size="lg"
                className="h-12 px-6 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white rounded-xl shadow-lg shadow-emerald-600/25 transition-all duration-300 disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Search className="h-4 w-4 mr-2" />
                    Lookup
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Error State */}
        {error && (
          <div className="animate-in fade-in slide-in-from-top-2 duration-300">
            <Alert className="border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/30">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-amber-900 dark:text-amber-200">
                {error}
              </AlertDescription>
            </Alert>
          </div>
        )}

        {/* Chemical Data Display - Animated Card */}
        {chemicalData && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="relative bg-gradient-to-br from-white to-neutral-50 dark:from-neutral-900 dark:to-neutral-950 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-2xl shadow-neutral-900/10 overflow-hidden">
              {/* Decorative gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 via-transparent to-blue-500/5 pointer-events-none" />

              <div className="relative p-8 space-y-6">
                {/* Header Section */}
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-3">
                    <div className="flex items-center gap-3">
                      <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800 px-3 py-1">
                        <CheckCircle2 className="h-3 w-3 mr-1.5" />
                        Verified
                      </Badge>
                      {chemicalData.pubchemCid && (
                        <a
                          href={`https://pubchem.ncbi.nlm.nih.gov/compound/${chemicalData.pubchemCid}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-neutral-600 dark:text-neutral-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
                        >
                          PubChem CID {chemicalData.pubchemCid}
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </div>
                    <h2 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-neutral-900 to-neutral-700 dark:from-white dark:to-neutral-300 bg-clip-text text-transparent">
                      {chemicalData.name}
                    </h2>
                    <p className="text-sm font-mono text-neutral-600 dark:text-neutral-400 tracking-wide">
                      CAS {chemicalData.cas}
                    </p>
                  </div>
                </div>

                {/* Properties Grid */}
                <div className="grid grid-cols-2 gap-6">
                  {chemicalData.molecularFormula && (
                    <div className="space-y-2 p-4 rounded-xl bg-neutral-100/50 dark:bg-neutral-800/50 border border-neutral-200/50 dark:border-neutral-700/50">
                      <div className="text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                        Molecular Formula
                      </div>
                      <div className="text-2xl font-mono font-bold text-neutral-900 dark:text-white">
                        {chemicalData.molecularFormula}
                      </div>
                    </div>
                  )}
                  {chemicalData.molecularWeight && (
                    <div className="space-y-2 p-4 rounded-xl bg-neutral-100/50 dark:bg-neutral-800/50 border border-neutral-200/50 dark:border-neutral-700/50">
                      <div className="text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                        Molecular Weight
                      </div>
                      <div className="text-2xl font-bold text-neutral-900 dark:text-white">
                        {Number(chemicalData.molecularWeight).toFixed(2)}{' '}
                        <span className="text-base font-normal text-neutral-500">g/mol</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* IUPAC Name */}
                {chemicalData.iupacName && chemicalData.iupacName !== chemicalData.name && (
                  <div className="space-y-2 p-4 rounded-xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/50">
                    <div className="text-xs font-medium text-blue-700 dark:text-blue-300 uppercase tracking-wider">
                      IUPAC Systematic Name
                    </div>
                    <div className="text-sm text-blue-900 dark:text-blue-100 break-words leading-relaxed">
                      {chemicalData.iupacName}
                    </div>
                  </div>
                )}

                {/* Synonyms */}
                {chemicalData.synonyms && chemicalData.synonyms.length > 0 && (
                  <div className="space-y-3">
                    <div className="text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                      Common Synonyms
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {chemicalData.synonyms.slice(0, 6).map((synonym, index) => (
                        <Badge
                          key={index}
                          variant="secondary"
                          className="px-3 py-1.5 text-xs font-medium bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border-neutral-200 dark:border-neutral-700"
                        >
                          {synonym}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Regulatory Warnings */}
                {regulatoryFlags && regulatoryFlags.warnings.length > 0 && (
                  <div className="space-y-4 pt-6 border-t border-neutral-200 dark:border-neutral-800">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-amber-600" />
                      <h3 className="font-semibold text-neutral-900 dark:text-white">
                        Regulatory Compliance Alerts
                      </h3>
                    </div>

                    <div className="space-y-3">
                      {regulatoryFlags.warnings.map((warning, index) => (
                        <div
                          key={index}
                          className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 animate-in fade-in slide-in-from-left duration-300"
                          style={{ animationDelay: `${index * 50}ms` }}
                        >
                          <p className="text-sm text-amber-900 dark:text-amber-100 leading-relaxed">
                            {warning}
                          </p>
                        </div>
                      ))}
                    </div>

                    {/* Compliance Badges */}
                    <div className="flex flex-wrap gap-2 pt-2">
                      {regulatoryFlags.reachSVHC && (
                        <Badge className="bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300 border-red-200 dark:border-red-800 px-3 py-1">
                          REACH SVHC
                        </Badge>
                      )}
                      {regulatoryFlags.rohs && (
                        <Badge className="bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300 border-red-200 dark:border-red-800 px-3 py-1">
                          RoHS Restricted
                        </Badge>
                      )}
                      {regulatoryFlags.prop65 && (
                        <Badge className="bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300 border-red-200 dark:border-red-800 px-3 py-1">
                          California Prop 65
                        </Badge>
                      )}
                    </div>

                    {/* Action Items */}
                    <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/50">
                      <div className="flex items-start gap-3">
                        <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                        <div className="space-y-2 flex-1">
                          <div className="font-semibold text-blue-900 dark:text-blue-100 text-sm">
                            Required Documentation
                          </div>
                          <ul className="space-y-1.5 text-sm text-blue-800 dark:text-blue-200">
                            <li className="flex items-start gap-2">
                              <span className="text-blue-400 mt-1">•</span>
                              <span>Safety Data Sheet (SDS)</span>
                            </li>
                            <li className="flex items-start gap-2">
                              <span className="text-blue-400 mt-1">•</span>
                              <span>Declaration of Compliance (DoC)</span>
                            </li>
                            {regulatoryFlags.reachSVHC && (
                              <li className="flex items-start gap-2">
                                <span className="text-blue-400 mt-1">•</span>
                                <span>SVHC concentration levels (if &gt; 0.1% w/w)</span>
                              </li>
                            )}
                            {chemicalData.name.toLowerCase().includes('bisphenol') && (
                              <li className="flex items-start gap-2">
                                <span className="text-blue-400 mt-1">•</span>
                                <span>Migration testing results for food contact</span>
                              </li>
                            )}
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Help Text */}
        {!chemicalData && !error && !loading && (
          <div className="text-center space-y-2 py-8">
            <p className="text-sm text-neutral-600 dark:text-neutral-400">
              Enter a CAS Registry Number to retrieve comprehensive chemical data and regulatory compliance status
            </p>
            <div className="flex items-center justify-center gap-4 text-xs text-neutral-500 dark:text-neutral-500 font-mono">
              <span>50-00-0 (Formaldehyde)</span>
              <span>•</span>
              <span>9003-07-0 (Polypropylene)</span>
              <span>•</span>
              <span>80-05-7 (BPA)</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

/**
 * Inline CAS Lookup - Compact version for forms
 */
interface InlineCASLookupProps {
  value: string
  onChange: (value: string) => void
  onChemicalFound?: (data: ChemicalData) => void
}

export function InlineCASLookup({ value, onChange, onChemicalFound }: InlineCASLookupProps) {
  const [looking, setLooking] = useState(false)
  const [chemicalName, setChemicalName] = useState<string | null>(null)
  const [hasWarnings, setHasWarnings] = useState(false)

  const handleBlur = async () => {
    if (!value.trim() || value === chemicalName) return

    setLooking(true)
    try {
      const data = await lookupCAS(value)
      if (data) {
        setChemicalName(data.name)
        const flags = await checkRegulatoryStatus(data.cas, data.name)
        setHasWarnings(flags.warnings.length > 0)
        if (onChemicalFound) {
          onChemicalFound(data)
        }
      }
    } catch (err) {
      console.error('CAS lookup failed:', err)
    } finally {
      setLooking(false)
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2 items-center">
        <Input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={handleBlur}
          placeholder="CAS Number"
          className="font-mono"
        />
        {looking && (
          <Loader2 className="h-4 w-4 animate-spin text-emerald-600 flex-shrink-0" />
        )}
      </div>
      {chemicalName && (
        <div className="flex items-center gap-2 text-sm animate-in fade-in slide-in-from-top-1 duration-200">
          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 flex-shrink-0" />
          <span className="text-neutral-600 dark:text-neutral-400 truncate">{chemicalName}</span>
          {hasWarnings && (
            <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300 border-amber-200 dark:border-amber-800 text-xs px-2 py-0.5">
              Review Required
            </Badge>
          )}
        </div>
      )}
    </div>
  )
}
