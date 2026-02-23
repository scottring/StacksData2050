'use client'

import { SDSDocument, SAPDocument, ExcelDocument, CoADocument } from '../ui/MockDocument'
import FloatingLabel from '../ui/FloatingLabel'
import { FileText, Database, Table, Award } from 'lucide-react'

interface Act1Props {
  progress: number
}

export default function Act1SupplierIsland({ progress }: Act1Props) {
  // Animation phases
  const showIsland = progress > 0.05
  const showSDS = progress > 0.15
  const showSAP = progress > 0.35
  const showExcel = progress > 0.5
  const showCoA = progress > 0.5
  const showDragHint = progress > 0.65 && progress < 0.85
  const showTagline = progress > 0.85
  const docsMoving = progress > 0.75

  // Calc transforms for the "moving toward chipper" effect
  const moveX = docsMoving ? Math.min(1, (progress - 0.75) / 0.25) : 0

  return (
    <section className="relative flex h-screen items-center justify-center overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950" />

      {/* Island "platform" visual */}
      <div
        className="absolute bottom-0 left-1/2 -translate-x-1/2 h-24 w-[80%] max-w-4xl rounded-t-[50%] bg-gradient-to-t from-emerald-900/20 to-transparent transition-all duration-1000"
        style={{ opacity: showIsland ? 0.6 : 0 }}
      />

      {/* Act title */}
      <div className="absolute top-24 left-8 z-20">
        <FloatingLabel text="Act 1" visible={showIsland} variant="subtitle" />
        <FloatingLabel text="The Source" visible={showIsland} variant="title" className="mt-1" />
      </div>

      {/* Document grid */}
      <div className="relative z-10 grid max-w-5xl grid-cols-1 gap-4 px-6 md:grid-cols-2 lg:grid-cols-4">
        {/* SDS */}
        <div
          className="transition-all duration-700 ease-out"
          style={{
            opacity: showSDS ? 1 : 0,
            transform: `translateY(${showSDS ? 0 : 40}px) translateX(${moveX * 200}px) scale(${1 - moveX * 0.3})`,
          }}
        >
          <div className="mb-2 flex items-center gap-2 text-xs text-red-400">
            <FileText className="h-3.5 w-3.5" />
            <span className="font-mono">SDS.pdf</span>
          </div>
          <SDSDocument />
        </div>

        {/* SAP Export */}
        <div
          className="transition-all duration-700 ease-out delay-100"
          style={{
            opacity: showSAP ? 1 : 0,
            transform: `translateY(${showSAP ? 0 : 40}px) translateX(${moveX * 150}px) scale(${1 - moveX * 0.3})`,
          }}
        >
          <div className="mb-2 flex items-center gap-2 text-xs text-blue-400">
            <Database className="h-3.5 w-3.5" />
            <span className="font-mono">SAP_export.csv</span>
          </div>
          <SAPDocument />
        </div>

        {/* Excel Lab Results */}
        <div
          className="transition-all duration-700 ease-out delay-200"
          style={{
            opacity: showExcel ? 1 : 0,
            transform: `translateY(${showExcel ? 0 : 40}px) translateX(${moveX * 100}px) scale(${1 - moveX * 0.3})`,
          }}
        >
          <div className="mb-2 flex items-center gap-2 text-xs text-green-400">
            <Table className="h-3.5 w-3.5" />
            <span className="font-mono">lab_results.xlsx</span>
          </div>
          <ExcelDocument />
        </div>

        {/* CoA */}
        <div
          className="transition-all duration-700 ease-out delay-300"
          style={{
            opacity: showCoA ? 1 : 0,
            transform: `translateY(${showCoA ? 0 : 40}px) translateX(${moveX * 50}px) scale(${1 - moveX * 0.3})`,
          }}
        >
          <div className="mb-2 flex items-center gap-2 text-xs text-amber-400">
            <Award className="h-3.5 w-3.5" />
            <span className="font-mono">CoA_BN-2024-0847.pdf</span>
          </div>
          <CoADocument />
        </div>
      </div>

      {/* Drag hint */}
      <div
        className="absolute bottom-32 left-1/2 -translate-x-1/2 z-20 text-center transition-all duration-500"
        style={{ opacity: showDragHint ? 1 : 0 }}
      >
        <div className="text-xs font-mono text-zinc-500 animate-pulse">
          Loading into the chipper...
        </div>
      </div>

      {/* Tagline */}
      <div className="absolute bottom-16 left-1/2 -translate-x-1/2 z-20 text-center">
        <FloatingLabel
          text="4 documents. 3 formats. 1 product."
          visible={showTagline}
          variant="tagline"
        />
      </div>
    </section>
  )
}
