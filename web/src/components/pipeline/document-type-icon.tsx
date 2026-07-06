import { FileText, Globe, Code2, ShieldCheck } from 'lucide-react'
import { cn } from '@/lib/utils'

interface DocumentTypeIconProps {
  type: string
  size?: 'sm' | 'md' | 'lg'
}

const TYPE_CONFIG: Record<string, { icon: React.ComponentType<{ className?: string }>; bg: string; color: string; label: string }> = {
  reach_svhc_declaration: {
    icon: ShieldCheck,
    bg: 'bg-blue-100',
    color: 'text-blue-600',
    label: 'REACH SVHC',
  },
  fda_compliance_letter: {
    icon: FileText,
    bg: 'bg-emerald-100',
    color: 'text-emerald-600',
    label: 'FDA Letter',
  },
  dpp_json_ld: {
    icon: Code2,
    bg: 'bg-violet-100',
    color: 'text-violet-600',
    label: 'DPP JSON-LD',
  },
  china_gb_certificate: {
    icon: Globe,
    bg: 'bg-red-100',
    color: 'text-red-600',
    label: 'China GB',
  },
}

const SIZE_CLASSES = {
  sm: { wrapper: 'h-6 w-6', icon: 'h-3 w-3' },
  md: { wrapper: 'h-8 w-8', icon: 'h-4 w-4' },
  lg: { wrapper: 'h-10 w-10', icon: 'h-5 w-5' },
}

export default function DocumentTypeIcon({ type, size = 'md' }: DocumentTypeIconProps) {
  const config = TYPE_CONFIG[type] || TYPE_CONFIG.reach_svhc_declaration
  const Icon = config.icon
  const sizeClass = SIZE_CLASSES[size]

  return (
    <div className={cn('flex items-center justify-center rounded-lg', config.bg, sizeClass.wrapper)}>
      <Icon className={cn(config.color, sizeClass.icon)} />
    </div>
  )
}

export function getDocumentTypeLabel(type: string): string {
  return TYPE_CONFIG[type]?.label || type
}
