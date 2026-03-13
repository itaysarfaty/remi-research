import { useReducer, useEffect, useMemo } from 'react'
import { isAbortError } from '@/lib/utils'
import type {
  ResearchState,
  StreamEvent,
  PipelineStage,
  SearchUrl,
  TimelineProgress,
  TimelineStep,
  StepStatus,
  SearchBatchDisplay,
} from '@/types'

const initialState: ResearchState = {
  stage: 'idle',
  errorAtStage: null,
  gateKeeperResult: null,
  plan: null,
  searchBatches: [],
  batchUrls: [],
  searchResultsCount: 0,
  extractionProgress: null,
  report: '',
  citedSources: [],
  error: null,
}

type Action = StreamEvent | { type: 'reset' }

function reducer(state: ResearchState, event: Action): ResearchState {
  switch (event.type) {
    case 'reset':
      return initialState
    case 'stage':
      if (event.stage === 'error') {
        return { ...state, stage: 'error', errorAtStage: state.stage }
      }
      return { ...state, stage: event.stage }
    case 'gate-keeper':
      return { ...state, gateKeeperResult: event.result }
    case 'plan':
      return { ...state, plan: event.plan }
    case 'search-batch':
      return { ...state, searchBatches: [...state.searchBatches, event.batch] }
    case 'batch-urls':
      return {
        ...state,
        batchUrls: [
          ...state.batchUrls,
          { batchIndex: event.batchIndex, urls: event.urls },
        ],
      }
    case 'search-results':
      return { ...state, searchResultsCount: event.count }
    case 'extraction-progress':
      return {
        ...state,
        extractionProgress: {
          extracted: event.extracted,
          total: event.total,
        },
      }
    case 'report-delta':
      return { ...state, report: state.report + event.delta }
    case 'sources':
      return { ...state, citedSources: event.sources }
    case 'error':
      return { ...state, error: event.message }
  }
}

const uiSteps = [
  { key: 'planning' as const, label: 'Planning research', stages: ['validating', 'planning'] as PipelineStage[] },
  { key: 'searching' as const, label: 'Searching the web', stages: ['searching', 'extracting'] as PipelineStage[] },
  { key: 'writing' as const, label: 'Writing report', stages: ['writing'] as PipelineStage[] },
]

const allStagesOrdered: PipelineStage[] = [
  'validating', 'planning', 'searching', 'extracting', 'writing', 'complete',
]

function getGroupStatus(
  groupStages: PipelineStage[],
  currentStage: PipelineStage,
  errorAtStage: PipelineStage | null,
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

function dedupliceDomains(urls: SearchUrl[]) {
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

function deriveTimelineProgress(state: ResearchState): TimelineProgress {
  const { stage, errorAtStage, plan, searchBatches, batchUrls, searchResultsCount } = state

  const searchLabel = searchResultsCount > 0
    ? `Searching · ${searchResultsCount} sources`
    : 'Searching the web'

  const steps: TimelineStep[] = uiSteps.map((step) => ({
    key: step.key,
    label: step.key === 'searching' ? searchLabel : step.label,
    status: getGroupStatus(step.stages, stage, errorAtStage),
    defaultExpanded: step.key !== 'writing',
  }))

  const batches: SearchBatchDisplay[] = searchBatches.map((batch) => {
    const result = batchUrls.find((b) => b.batchIndex === batch.batchIndex)
    return {
      label: batch.label,
      queries: batch.queries,
      sites: result ? dedupliceDomains(result.urls) : null,
    }
  })

  return {
    steps,
    planSummary: plan?.summary ?? null,
    searchBatches: batches,
  }
}

export function useResearch(query: string | null, key: number = 0) {
  const [state, dispatch] = useReducer(reducer, initialState)

  useEffect(() => {
    dispatch({ type: 'reset' })

    if (!query) return

    const controller = new AbortController()

    async function run() {
      try {
        const response = await fetch('/api/research', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query }),
          signal: controller.signal,
        })

        if (!response.ok || !response.body) {
          dispatch({
            type: 'error',
            message: `Failed to start research (${response.status})`,
          })
          dispatch({ type: 'stage', stage: 'error' })
          return
        }

        const reader = response.body.getReader()
        const decoder = new TextDecoder()
        let buffer = ''

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          buffer += decoder.decode(value, { stream: true })

          const lines = buffer.split('\n\n')
          buffer = lines.pop() ?? ''

          for (const line of lines) {
            const trimmed = line.trim()
            if (!trimmed.startsWith('data: ')) continue
            try {
              const event = JSON.parse(trimmed.slice(6)) as StreamEvent
              dispatch(event)
            } catch {
              // Skip malformed events
            }
          }
        }

        if (buffer.trim().startsWith('data: ')) {
          try {
            const event = JSON.parse(buffer.trim().slice(6)) as StreamEvent
            dispatch(event)
          } catch {
            // Skip
          }
        }
      } catch (err) {
        if (isAbortError(err)) return
        dispatch({ type: 'error', message: 'Connection lost' })
        dispatch({ type: 'stage', stage: 'error' })
      }
    }

    run()

    return () => controller.abort()
  }, [query, key])

  const timelineProgress = useMemo(
    () => deriveTimelineProgress(state),
    [state.stage, state.errorAtStage, state.plan, state.searchBatches, state.batchUrls, state.searchResultsCount],
  )

  return { state, timelineProgress }
}
