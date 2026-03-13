export type ResearchStage =
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

export interface PlannerTopic {
  section: 'overview' | 'origin' | 'today'
  topic: string
  description: string
}

export interface ResearchPlan {
  query: string
  summary: string
  topics: PlannerTopic[]
}

export interface SearchBatch {
  batchIndex: number
  label: string
  queries: string[]
}

export interface SearchBatchResult {
  batchIndex: number
  urls: Array<{ url: string; title: string }>
}

export interface ResearchSource {
  index: number
  url: string
  title: string
  content: string
}

// Discriminated union for all SSE events
export type ResearchEvent =
  | { type: 'stage'; stage: ResearchStage }
  | { type: 'gate-keeper'; result: GateKeeperResult }
  | { type: 'plan'; plan: ResearchPlan }
  | { type: 'search-batch'; batch: SearchBatch }
  | { type: 'batch-urls'; batchIndex: number; urls: Array<{ url: string; title: string }> }
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

// Client-side state managed by useReducer
export interface ResearchState {
  stage: ResearchStage
  /** The last stage before an error occurred */
  errorAtStage: ResearchStage | null
  gateKeeperResult: GateKeeperResult | null
  plan: ResearchPlan | null
  searchBatches: SearchBatch[]
  batchUrls: SearchBatchResult[]
  searchResultsCount: number
  extractionProgress: { extracted: number; total: number } | null
  report: string
  citedSources: ResearchSource[]
  error: string | null
}
