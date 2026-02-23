'use client'

import { sdsDocument, sapExportTable, excelLabResults, coaDocument } from '@/lib/vision/mock-data'

// Shared wrapper for all mock documents
function DocCard({ children, color, title, className = '' }: {
  children: React.ReactNode
  color: string
  title: string
  className?: string
}) {
  return (
    <div className={`relative rounded-lg border bg-zinc-900/90 backdrop-blur-sm shadow-2xl overflow-hidden ${className}`}>
      <div className={`h-1 w-full ${color}`} />
      <div className="p-4 font-mono text-[10px] leading-relaxed">
        <div className="mb-2 text-[11px] font-bold tracking-wider text-zinc-300 uppercase">{title}</div>
        {children}
      </div>
    </div>
  )
}

function Field({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex gap-2">
      <span className="text-zinc-500 shrink-0">{label}:</span>
      <span className={highlight ? 'text-emerald-400 font-semibold' : 'text-zinc-300'}>{value}</span>
    </div>
  )
}

export function SDSDocument({ className = '' }: { className?: string }) {
  const d = sdsDocument
  return (
    <DocCard color="bg-red-500" title={d.title} className={className}>
      <div className="text-[9px] text-zinc-500 mb-2">{d.subtitle}</div>
      <div className="space-y-1">
        <Field label="Product" value={d.fields.productName} highlight />
        <Field label="Manufacturer" value={d.fields.manufacturer} />
        <Field label="CAS Numbers" value={d.fields.casNumbers} highlight />
        <Field label="Classification" value={d.fields.hazardClassification} />
        <Field label="Signal Word" value={d.fields.ghsSignalWord} />
      </div>
      <div className="mt-3 border-t border-zinc-800 pt-2">
        <div className="font-bold text-zinc-400 mb-1">Section 3 — Composition</div>
        <table className="w-full text-[9px]">
          <thead>
            <tr className="text-zinc-500">
              <th className="text-left py-0.5">Substance</th>
              <th className="text-left py-0.5">CAS</th>
              <th className="text-left py-0.5">Range</th>
            </tr>
          </thead>
          <tbody>
            {d.composition.map((row, i) => (
              <tr key={i} className="text-zinc-300 border-t border-zinc-800/50">
                <td className="py-0.5 pr-2">{row.name}</td>
                <td className="py-0.5 pr-2 text-emerald-400/80">{row.cas}</td>
                <td className="py-0.5">{row.range}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </DocCard>
  )
}

export function SAPDocument({ className = '' }: { className?: string }) {
  const d = sapExportTable
  return (
    <DocCard color="bg-blue-500" title={d.title} className={className}>
      <div className="text-[9px] text-zinc-500 mb-1">{d.system}</div>
      <Field label="Batch" value={d.batch} />
      <Field label="Site" value={d.productionSite} highlight />
      <table className="w-full text-[9px] mt-2">
        <thead>
          <tr className="text-zinc-500 border-b border-zinc-800">
            <th className="text-left py-0.5">Mat. No.</th>
            <th className="text-left py-0.5">Description</th>
            <th className="text-left py-0.5">CAS</th>
            <th className="text-right py-0.5">Conc %</th>
          </tr>
        </thead>
        <tbody>
          {d.rows.map((row, i) => (
            <tr key={i} className="text-zinc-300 border-t border-zinc-800/50">
              <td className="py-0.5 pr-2 text-zinc-500">{row.materialNo}</td>
              <td className="py-0.5 pr-2">{row.description}</td>
              <td className="py-0.5 pr-2 text-blue-400/80">{row.cas}</td>
              <td className="py-0.5 text-right text-blue-300">{row.concentration}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </DocCard>
  )
}

export function ExcelDocument({ className = '' }: { className?: string }) {
  const d = excelLabResults
  return (
    <DocCard color="bg-green-500" title={d.title} className={className}>
      <div className="text-[9px] text-zinc-500 mb-1">{d.standard}</div>
      <div className="space-y-0.5 mb-2">
        <Field label="Lab" value={d.lab} />
        <Field label="Simulant" value={d.simulant} />
        <Field label="Conditions" value={d.contactConditions} />
      </div>
      <table className="w-full text-[9px]">
        <thead>
          <tr className="text-zinc-500 border-b border-zinc-800">
            <th className="text-left py-0.5">Substance</th>
            <th className="text-right py-0.5">SML</th>
            <th className="text-right py-0.5">Result</th>
            <th className="text-center py-0.5">Pass</th>
          </tr>
        </thead>
        <tbody>
          {d.results.map((row, i) => (
            <tr key={i} className="text-zinc-300 border-t border-zinc-800/50">
              <td className="py-0.5 pr-2">{row.substance}</td>
              <td className="py-0.5 text-right pr-2 text-zinc-500">{row.sml}</td>
              <td className="py-0.5 text-right pr-2 text-violet-400/80">{row.result}</td>
              <td className="py-0.5 text-center text-emerald-400">{row.pass ? '\u2713' : '\u2717'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </DocCard>
  )
}

export function CoADocument({ className = '' }: { className?: string }) {
  const d = coaDocument
  return (
    <DocCard color="bg-amber-500" title={d.title} className={className}>
      <div className="space-y-0.5 mb-2">
        <Field label="Product" value={d.product} highlight />
        <Field label="Batch" value={d.batch} />
        <Field label="Analysis Date" value={d.dateOfAnalysis} />
      </div>
      <table className="w-full text-[9px]">
        <thead>
          <tr className="text-zinc-500 border-b border-zinc-800">
            <th className="text-left py-0.5">Parameter</th>
            <th className="text-right py-0.5">Result</th>
            <th className="text-right py-0.5">Spec</th>
            <th className="text-center py-0.5">Pass</th>
          </tr>
        </thead>
        <tbody>
          {d.results.map((row, i) => (
            <tr key={i} className="text-zinc-300 border-t border-zinc-800/50">
              <td className="py-0.5 pr-2">{row.parameter}</td>
              <td className="py-0.5 text-right pr-2 text-amber-300">{row.value}</td>
              <td className="py-0.5 text-right pr-2 text-zinc-500">{row.spec}</td>
              <td className="py-0.5 text-center text-emerald-400">{row.pass ? '\u2713' : '\u2717'}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="mt-2 pt-2 border-t border-zinc-800 text-emerald-400 text-[9px]">
        {d.conclusion}
      </div>
    </DocCard>
  )
}
