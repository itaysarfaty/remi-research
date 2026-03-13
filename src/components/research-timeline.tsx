import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils.ts'
import { TimelineStep } from './timeline-step.tsx'
import { StreamingText } from './streaming-text.tsx'
import type { TimelineProgress, SearchBatchDisplay } from '../types.ts'

interface ResearchTimelineProps {
  progress: TimelineProgress
}

const MAX_VISIBLE_FAVICONS = 3

function SearchBatchRow({ batch }: { batch: SearchBatchDisplay }) {
  const [open, setOpen] = useState(false)
  const visible = batch.sites?.slice(0, MAX_VISIBLE_FAVICONS) ?? []
  const remaining = batch.sites ? batch.sites.length - MAX_VISIBLE_FAVICONS : 0

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-3 w-full min-h-[28px] group"
      >
        <ChevronDown
          className={cn(
            'size-3 shrink-0 text-muted-foreground transition-transform duration-200 -rotate-90',
            open && 'rotate-0',
          )}
        />
        <span className="shrink-0 text-xs font-medium text-foreground/70 truncate">
          {batch.label}
        </span>
        <div className="flex items-center gap-1 ml-auto">
          {visible.map((site) => (
            <span
              key={site.domain}
              className="flex items-center justify-center size-6 rounded-md bg-muted/50"
            >
              <img
                src={`https://www.google.com/s2/favicons?domain=${site.domain}&sz=32`}
                alt=""
                className="size-3.5 rounded-sm"
              />
            </span>
          ))}
          {remaining > 0 && (
            <span className="flex items-center justify-center h-6 px-1.5 rounded-md bg-muted/50 text-[10px] font-medium text-muted-foreground">
              +{remaining}
            </span>
          )}
          {!batch.sites && (
            <div className="flex gap-1">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="size-6 rounded-md bg-muted/30 animate-pulse"
                  style={{ animationDelay: `${i * 150}ms` }}
                />
              ))}
            </div>
          )}
        </div>
      </button>

      {open && batch.sites && (
        <div className="mt-1.5 ml-6 space-y-0.5">
          {batch.queries.map((q, i) => (
            <p key={i} className="text-[11px] text-muted-foreground/70 leading-relaxed">
              {q}
            </p>
          ))}
        </div>
      )}
    </div>
  )
}

export function ResearchTimeline({ progress }: ResearchTimelineProps) {
  const { steps, planSummary, searchBatches } = progress

  const childrenByKey: Record<string, React.ReactNode> = {
    planning: planSummary ? (
      <StreamingText text={planSummary} speed={3} interval={12} />
    ) : undefined,
    searching: searchBatches.length > 0 ? (
      <div className="space-y-2">
        {searchBatches.map((batch, i) => (
          <SearchBatchRow key={i} batch={batch} />
        ))}
      </div>
    ) : undefined,
  }

  return (
    <div className="space-y-0">
      {steps.map((step, i) => (
        <TimelineStep
          key={step.key}
          label={step.label}
          status={step.status}
          isLast={i === steps.length - 1}
          defaultExpanded={step.defaultExpanded}
        >
          {childrenByKey[step.key]}
        </TimelineStep>
      ))}
    </div>
  )
}
