import { Badge } from '@/components/ui/badge'
import { CheckCircle2, Clock, AlertCircle, Send, Flag } from 'lucide-react'

interface RequestStatusBadgeProps {
  status: 'created' | 'reviewed' | 'responded' | 'approved' | 'flagged'
  size?: 'sm' | 'default'
}

export function RequestStatusBadge({ status, size = 'default' }: RequestStatusBadgeProps) {
  const configs = {
    created: {
      label: 'Created',
      icon: Clock,
      className: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400'
    },
    reviewed: {
      label: 'Reviewed',
      icon: Send,
      className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
    },
    responded: {
      label: 'Responded',
      icon: CheckCircle2,
      className: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
    },
    approved: {
      label: 'Approved',
      icon: CheckCircle2,
      className: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
    },
    flagged: {
      label: 'Flagged',
      icon: Flag,
      className: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
    }
  }

  const config = configs[status]
  const Icon = config.icon
  const iconSize = size === 'sm' ? 'h-3 w-3' : 'h-4 w-4'

  return (
    <Badge className={config.className}>
      <Icon className={`${iconSize} mr-1`} />
      {config.label}
    </Badge>
  )
}
