export type PipelineStage =
  | 'idle'
  | 'validating'
  | 'planning'
  | 'searching'
  | 'extracting'
  | 'writing'
  | 'complete'
  | 'error'

export interface GateKeeperResult {
  valid: boolean
  reason: string | null
  normalizedQuery: string
}

export interface ResearchPlan {
  query: string
  summary: string
  topics: Array<{
    section: 'overview' | 'origin' | 'today'
    topic: string
    description: string
  }>
}

export interface SearchUrl {
  url: string
  title: string
}

export interface SearchBatch {
  batchIndex: number
  label: string
  queries: string[]
}

export interface ResearchSource {
  index: number
  url: string
  title: string
  content: string
}

// Discriminated union for all SSE events
export type StreamEvent =
  | { type: 'stage'; stage: PipelineStage }
  | { type: 'gate-keeper'; result: GateKeeperResult }
  | { type: 'plan'; plan: ResearchPlan }
  | { type: 'search-batch'; batch: SearchBatch }
  | { type: 'batch-urls'; batchIndex: number; urls: SearchUrl[] }
  | { type: 'search-results'; count: number }
  | { type: 'extraction-progress'; extracted: number; total: number }
  | { type: 'report-delta'; delta: string }
  | { type: 'sources'; sources: ResearchSource[] }
  | { type: 'error'; message: string }

// Timeline progress model — display-ready view of ResearchState
export type StepStatus = 'pending' | 'active' | 'complete' | 'error'

export interface TimelineStep {
  key: 'planning' | 'searching' | 'writing'
  label: string
  status: StepStatus
  defaultExpanded: boolean
}

export interface SearchBatchDisplay {
  label: string
  queries: string[]
  /** Pre-deduplicated domains, or null if still loading */
  sites: Array<{ domain: string; url: string; title: string }> | null
}

export interface TimelineProgress {
  steps: TimelineStep[]
  planSummary: string | null
  searchBatches: SearchBatchDisplay[]
}

