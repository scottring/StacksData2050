'use client'

import { actDefinitions, sdsDocument, sapExportTable, dataChips, regulatoryLanes, outputDocuments, customerCard } from '@/lib/vision/mock-data'
import DataChip from './ui/DataChip'
import { ChevronDown, FileText, Database, Table, Award, Zap, Shield, FileCheck2, QrCode, ArrowRight, Mail } from 'lucide-react'

function MobileSection({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <section className={`relative min-h-screen flex flex-col items-center justify-center px-5 py-16 snap-start ${className}`}>
      {children}
    </section>
  )
}

function MobileActBadge({ act }: { act: typeof actDefinitions[0] }) {
  return (
    <div className="text-center mb-6">
      <div className="text-[10px] font-mono text-emerald-400/60 uppercase tracking-wider mb-1">Act {act.id}</div>
      <h2 className="font-display text-3xl font-bold text-white">{act.title}</h2>
      <p className="text-sm text-zinc-500 mt-1">{act.subtitle}</p>
    </div>
  )
}

export default function VisionMobilePage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-white snap-y snap-mandatory overflow-y-auto">
      {/* Mobile Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 py-3 backdrop-blur-md bg-zinc-950/80 border-b border-white/5">
        <span className="text-sm font-bold tracking-tight text-emerald-400">STACKS</span>
        <span className="text-[10px] text-zinc-500">The Vision</span>
      </nav>

      {/* HERO */}
      <MobileSection>
        <div className="absolute inset-0 bg-zinc-950" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(16,185,129,0.1),transparent_70%)]" />
        <div className="relative z-10 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/5 px-3 py-1 mb-6">
            <div className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[10px] font-mono tracking-[0.15em] uppercase text-emerald-400/90">Stacks Data</span>
          </div>
          <h1 className="font-display text-4xl font-bold leading-tight text-white">
            One Product.<br />
            <span className="text-emerald-400">Every Format.</span><br />
            Zero Rework.
          </h1>
          <p className="text-sm text-zinc-400 mt-4 max-w-sm mx-auto">
            See how Stacks transforms 4 source documents into 6 regulatory formats automatically.
          </p>
          <div className="mt-8 animate-bounce">
            <ChevronDown className="h-5 w-5 text-zinc-600 mx-auto" />
          </div>
        </div>
      </MobileSection>

      {/* ACT 1: SOURCE DOCUMENTS */}
      <MobileSection className="bg-zinc-950">
        <MobileActBadge act={actDefinitions[0]} />
        <div className="w-full max-w-sm space-y-3">
          {/* SDS card */}
          <div className="rounded-lg border border-red-500/30 bg-red-500/5 p-4">
            <div className="flex items-center gap-2 mb-2">
              <FileText className="h-4 w-4 text-red-400" />
              <span className="text-xs font-mono text-red-400">Safety Data Sheet</span>
            </div>
            <div className="text-[10px] font-mono text-zinc-300 space-y-0.5">
              <div>Product: <span className="text-white font-semibold">{sdsDocument.fields.productName}</span></div>
              <div>CAS: <span className="text-emerald-400">{sdsDocument.fields.casNumbers}</span></div>
              <div>Hazard: {sdsDocument.fields.hazardClassification}</div>
            </div>
          </div>
          {/* SAP card */}
          <div className="rounded-lg border border-blue-500/30 bg-blue-500/5 p-4">
            <div className="flex items-center gap-2 mb-2">
              <Database className="h-4 w-4 text-blue-400" />
              <span className="text-xs font-mono text-blue-400">SAP Export</span>
            </div>
            <div className="text-[10px] font-mono text-zinc-300 space-y-0.5">
              {sapExportTable.rows.map((r, i) => (
                <div key={i}>{r.description}: <span className="text-blue-300">{r.concentration}%</span></div>
              ))}
            </div>
          </div>
          {/* Excel + CoA mini cards */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg border border-green-500/30 bg-green-500/5 p-3">
              <Table className="h-4 w-4 text-green-400 mb-1" />
              <div className="text-[10px] font-mono text-zinc-400">Lab Results</div>
              <div className="text-[9px] text-zinc-500">EU 10/2011</div>
            </div>
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3">
              <Award className="h-4 w-4 text-amber-400 mb-1" />
              <div className="text-[10px] font-mono text-zinc-400">Certificate</div>
              <div className="text-[9px] text-zinc-500">Batch analysis</div>
            </div>
          </div>
        </div>
        <p className="text-xs font-mono text-emerald-400 mt-6">{actDefinitions[0].tagline}</p>
      </MobileSection>

      {/* ACT 2: THE CHIPPER */}
      <MobileSection className="bg-zinc-950">
        <MobileActBadge act={actDefinitions[1]} />
        {/* Customer card */}
        <div className="rounded-xl border border-emerald-500/30 bg-zinc-900/90 px-5 py-4 mb-6 w-full max-w-sm">
          <div className="flex items-center gap-2 mb-1">
            <Zap className="h-4 w-4 text-emerald-400" />
            <span className="text-sm font-bold text-white">{customerCard.companyName}</span>
          </div>
          <div className="text-[10px] text-emerald-400 font-mono">{customerCard.requestType}</div>
        </div>
        {/* Chipper visual */}
        <div className="w-20 h-20 rounded-2xl border-2 border-emerald-500/30 bg-zinc-800 flex items-center justify-center mb-6">
          <Zap className="h-8 w-8 text-emerald-400 animate-pulse" />
        </div>
        {/* Data chips output */}
        <div className="flex flex-wrap justify-center gap-1.5 max-w-sm">
          {dataChips.slice(0, 12).map((chip, i) => (
            <DataChip key={i} chip={chip} className="text-[8px]" />
          ))}
        </div>
        <p className="text-xs font-mono text-emerald-400 mt-6">{actDefinitions[1].tagline}</p>
      </MobileSection>

      {/* ACT 3: THE JOURNEY */}
      <MobileSection className="bg-zinc-950">
        <MobileActBadge act={actDefinitions[2]} />
        {/* Simplified globe visual */}
        <div className="relative w-48 h-48 rounded-full border border-emerald-500/20 bg-linear-to-br from-zinc-900 to-zinc-800 flex items-center justify-center mb-6">
          <div className="absolute inset-2 rounded-full border border-emerald-500/10" />
          <div className="absolute inset-4 rounded-full border border-emerald-500/5" />
          {/* Animated arc */}
          <svg className="absolute inset-0" viewBox="0 0 200 200">
            <path
              d="M 40 100 Q 100 20 160 100"
              fill="none"
              stroke="rgba(16,185,129,0.4)"
              strokeWidth="2"
              strokeDasharray="200"
              className="animate-draw-line"
            />
          </svg>
          <div className="text-center">
            <div className="text-[10px] font-mono text-zinc-500">Manchester</div>
            <div className="text-lg text-emerald-400 my-1">&rarr;</div>
            <div className="text-[10px] font-mono text-emerald-400">Stacks</div>
          </div>
        </div>
        <p className="text-lg font-display font-bold text-center">
          One universal format.<br />
          <span className="text-emerald-400">Every destination.</span>
        </p>
      </MobileSection>

      {/* ACT 4: THE INTELLIGENCE */}
      <MobileSection className="bg-zinc-950">
        <MobileActBadge act={actDefinitions[3]} />
        <div className="w-full max-w-sm space-y-2">
          {regulatoryLanes.map((lane) => {
            const colors: Record<string, string> = {
              blue: 'border-blue-500/30 bg-blue-500/5',
              red: 'border-red-500/30 bg-red-500/5',
              rose: 'border-rose-500/30 bg-rose-500/5',
              sky: 'border-sky-500/30 bg-sky-500/5',
              emerald: 'border-emerald-500/30 bg-emerald-500/5',
              amber: 'border-amber-500/30 bg-amber-500/5',
            }
            return (
              <div key={lane.id} className={`rounded-lg border p-3 ${colors[lane.color] || colors.blue}`}>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm">{lane.flag}</span>
                  <span className="text-xs font-bold text-white">{lane.name}</span>
                  <span className="text-[9px] text-zinc-500 font-mono ml-auto">{lane.region}</span>
                </div>
                <div className="text-[9px] text-zinc-400 font-mono">
                  {lane.fields[0]?.value}
                </div>
              </div>
            )
          })}
        </div>
        <p className="text-xs font-mono text-emerald-400 mt-6">{actDefinitions[3].tagline}</p>
      </MobileSection>

      {/* ACT 5: THE DELIVERY */}
      <MobileSection className="bg-zinc-950">
        <MobileActBadge act={actDefinitions[4]} />
        <div className="w-full max-w-sm space-y-3">
          {outputDocuments.map((doc) => {
            const colors: Record<string, string> = {
              blue: 'border-blue-500/30 bg-blue-500/5',
              red: 'border-red-500/30 bg-red-500/5',
              emerald: 'border-emerald-500/30 bg-emerald-500/5',
              rose: 'border-rose-500/30 bg-rose-500/5',
            }
            return (
              <div key={doc.id} className={`relative rounded-xl border p-4 ${colors[doc.color] || colors.blue}`}>
                <div className="flex items-start gap-3">
                  <span className="text-xl">{doc.flag}</span>
                  <div className="flex-1">
                    <div className="text-sm font-bold text-white">{doc.title}</div>
                    <div className="text-[10px] text-zinc-400 mt-0.5">{doc.subtitle}</div>
                    {doc.id === 'dpp-credential' && (
                      <div className="flex items-center gap-1.5 mt-2">
                        <QrCode className="h-4 w-4 text-emerald-400/60" />
                        <span className="text-[9px] font-mono text-zinc-500">GS1 Digital Link</span>
                      </div>
                    )}
                  </div>
                  <FileCheck2 className="h-5 w-5 text-emerald-400 shrink-0" />
                </div>
              </div>
            )
          })}
        </div>
        <p className="text-xs font-mono text-emerald-400 mt-6">{actDefinitions[4].tagline}</p>
      </MobileSection>

      {/* CTA */}
      <MobileSection className="bg-zinc-950">
        <div className="text-center">
          <div className="h-14 w-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-6">
            <span className="text-xl font-bold text-emerald-400">S</span>
          </div>
          <h2 className="font-display text-2xl font-bold text-white mb-3">
            Ready to eliminate rework?
          </h2>
          <p className="text-sm text-zinc-400 mb-6 max-w-xs mx-auto">
            Stop filling out the same compliance data in 12 different formats.
          </p>
          <div className="flex flex-col gap-3">
            <a href="/demo/compliance" className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-500 px-6 py-3 text-sm font-semibold text-white">
              See Live Demo <ArrowRight className="h-4 w-4" />
            </a>
            <a href="mailto:scott@stacksdata.com" className="inline-flex items-center justify-center gap-2 rounded-lg border border-zinc-700 px-6 py-3 text-sm font-semibold text-zinc-300">
              <Mail className="h-4 w-4" /> Contact Us
            </a>
          </div>
        </div>
      </MobileSection>
    </div>
  )
}
