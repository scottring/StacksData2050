'use client'

import { type DataChip as DataChipType, chipCategoryColors } from '@/lib/vision/mock-data'

interface DataChipProps {
  chip: DataChipType
  style?: React.CSSProperties
  className?: string
}

export default function DataChip({ chip, style, className = '' }: DataChipProps) {
  const colors = chipCategoryColors[chip.category]

  return (
    <div
      className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] font-mono whitespace-nowrap ${colors.bg} ${colors.border} ${colors.text} ${className}`}
      style={style}
    >
      <span className="text-zinc-500 font-medium">{chip.label}:</span>
      <span className="font-semibold">{chip.value}</span>
    </div>
  )
}
