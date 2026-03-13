import { useState } from 'react'
import { Circle, Loader2, CheckCircle2, XCircle, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils.ts'
import type { StepStatus } from '@/types'

interface TimelineStepProps {
  label: string
  status: StepStatus
  isLast?: boolean
  defaultExpanded?: boolean
  children?: React.ReactNode
}

const statusIcon: Record<StepStatus, React.ReactNode> = {
  pending: <Circle className="size-4 text-muted-foreground" />,
  active: <Loader2 className="size-4 text-primary animate-spin" />,
  complete: <CheckCircle2 className="size-4 text-primary" />,
  error: <XCircle className="size-4 text-destructive" />,
}

export function TimelineStep({
  label,
  status,
  isLast = false,
  defaultExpanded = false,
  children,
}: TimelineStepProps) {
  const [expanded, setExpanded] = useState(defaultExpanded)
  const hasChildren = !!children

  return (
    <div className="relative flex gap-3">
      {/* Vertical line */}
      {!isLast && (
        <div className="absolute left-[7px] top-6 bottom-0 w-px bg-border" />
      )}

      {/* Icon */}
      <div className="relative z-10 mt-0.5 flex shrink-0">{statusIcon[status]}</div>

      {/* Content */}
      <div className={cn('pb-5', isLast && 'pb-0')}>
        <button
          type="button"
          onClick={() => hasChildren && setExpanded(!expanded)}
          disabled={!hasChildren}
          className={cn(
            'flex items-center gap-1.5 text-sm font-medium',
            status === 'pending' && 'text-muted-foreground',
            status === 'active' && 'text-foreground',
            status === 'complete' && 'text-foreground',
            status === 'error' && 'text-destructive',
            hasChildren && 'cursor-pointer hover:text-primary transition-colors',
          )}
        >
          {label}
          {hasChildren && (
            <ChevronDown
              className={cn(
                'size-3.5 text-muted-foreground transition-transform duration-200',
                expanded && 'rotate-180',
              )}
            />
          )}
        </button>

        {expanded && children && (
          <div className="mt-2 text-sm text-muted-foreground">{children}</div>
        )}
      </div>
    </div>
  )
}
