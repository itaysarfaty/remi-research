import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils.ts'
import { TimelineStep } from './timeline-step.tsx'
import { StreamingText } from './streaming-text.tsx'
import type { ResearchState, ResearchStage, SearchBatch, SearchBatchResult } from '../types.ts'

interface ResearchTimelineProps {
  state: ResearchState
}

type StepStatus = 'pending' | 'active' | 'complete' | 'error'

// UI groups: which pipeline stages map to which UI step
const uiSteps = [
  { key: 'planning', stages: ['validating', 'planning'] as ResearchStage[] },
  { key: 'searching', stages: ['searching', 'extracting'] as ResearchStage[] },
  { key: 'writing', stages: ['writing'] as ResearchStage[] },
] as const

const allStagesOrdered: ResearchStage[] = [
  'validating',
  'planning',
  'searching',
  'extracting',
  'writing',
  'complete',
]

function getGroupStatus(
  groupStages: readonly ResearchStage[],
  currentStage: ResearchStage,
  errorAtStage: ResearchStage | null,
): StepStatus {
  const firstIdx = allStagesOrdered.indexOf(groupStages[0])
  const lastIdx = allStagesOrdered.indexOf(groupStages[groupStages.length - 1])
  const currentIdx = allStagesOrdered.indexOf(currentStage)

  if (currentStage === 'error' && errorAtStage) {
    const errorIdx = allStagesOrdered.indexOf(errorAtStage)
    if (errorIdx > lastIdx) return 'complete'
    if (errorIdx >= firstIdx) return 'error'
    return 'pending'
  }

  if (currentIdx > lastIdx) return 'complete'
  if (currentIdx >= firstIdx) return 'active'
  return 'pending'
}

function dedupliceDomains(urls: Array<{ url: string; title: string }>) {
  const seen = new Set<string>()
  const result: Array<{ domain: string; url: string; title: string }> = []
  for (const u of urls) {
    try {
      const domain = new URL(u.url).hostname
      if (!seen.has(domain)) {
        seen.add(domain)
        result.push({ domain, url: u.url, title: u.title })
      }
    } catch {
      // skip invalid urls
    }
  }
  return result
}

const MAX_VISIBLE_FAVICONS = 3

function SearchBatchRow({
  batch,
  batchResult,
}: {
  batch: SearchBatch
  batchResult: SearchBatchResult | undefined
}) {
  const [open, setOpen] = useState(false)
  const sites = batchResult ? dedupliceDomains(batchResult.urls) : []
  const visible = sites.slice(0, MAX_VISIBLE_FAVICONS)
  const remaining = sites.length - MAX_VISIBLE_FAVICONS

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
          {!batchResult && (
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

      {open && batchResult && (
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

export function ResearchTimeline({ state }: ResearchTimelineProps) {
  const {
    stage,
    errorAtStage,
    plan,
    searchBatches,
    searchResultsCount,
    batchUrls,
  } = state

  const searchLabel = searchResultsCount > 0
    ? `Searching · ${searchResultsCount} sources`
    : 'Searching the web'

  const steps: Array<{
    key: string
    stages: readonly ResearchStage[]
    label: string
    defaultExpanded?: boolean
    children?: React.ReactNode
  }> = [
    {
      key: 'planning',
      stages: uiSteps[0].stages,
      label: 'Planning research',
      defaultExpanded: true,
      children: plan && (
        <StreamingText text={plan.summary} speed={3} interval={12} />
      ),
    },
    {
      key: 'searching',
      stages: uiSteps[1].stages,
      label: searchLabel,
      defaultExpanded: true,
      children: searchBatches.length > 0 && (
        <div className="space-y-2">
          {searchBatches.map((batch) => (
            <SearchBatchRow
              key={batch.batchIndex}
              batch={batch}
              batchResult={batchUrls.find((b) => b.batchIndex === batch.batchIndex)}
            />
          ))}
        </div>
      ),
    },
    {
      key: 'writing',
      stages: uiSteps[2].stages,
      label: 'Writing report',
    },
  ]

  return (
    <div className="space-y-0">
      {steps.map((step, i) => (
        <TimelineStep
          key={step.key}
          label={step.label}
          status={getGroupStatus(step.stages, stage, errorAtStage)}
          isLast={i === steps.length - 1}
          defaultExpanded={step.defaultExpanded}
        >
          {step.children}
        </TimelineStep>
      ))}
    </div>
  )
}
