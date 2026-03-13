import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { RefreshCcw } from 'lucide-react'
import { useResearch } from '@/hooks/use-research'
import { ResearchTimeline } from '@/components/research-timeline'
import { ReportView } from '@/components/report-view'
import { SourcesList } from '@/components/sources-list'

export const Route = createFileRoute('/')({ component: App })

function App() {
  const [query, setQuery] = useState('')
  const [submittedQuery, setSubmittedQuery] = useState<string | null>(null)
  // Key forces useResearch to remount with fresh state on reset
  const [searchKey, setSearchKey] = useState(0)
  const { state, timelineProgress } = useResearch(submittedQuery, searchKey)

  const isResearching = submittedQuery !== null

  function handleSubmit(e: React.SyntheticEvent) {
    e.preventDefault()
    const trimmed = query.trim()
    if (!trimmed) return
    setSubmittedQuery(trimmed)
  }

  function handleReset() {
    setSubmittedQuery(null)
    setQuery('')
    setSearchKey((k) => k + 1)
  }

  return (
    <main
      className={
        isResearching
          ? 'min-h-svh px-4 py-6'
          : 'flex min-h-svh flex-col items-center justify-center px-4 pb-24'
      }
    >
      <div className={isResearching ? 'mx-auto max-w-2xl' : 'w-full max-w-xl'}>
        {/* Search bar */}
        <form onSubmit={handleSubmit} className={isResearching ? 'mb-8' : ''}>
          <div className="group relative">
            <img
              src="/remi-logo.svg"
              alt="Remi"
              className="absolute left-4 top-1/2 size-7 -translate-y-1/2"
            />
            <input
              type="text"
              value={query}
              onChange={(e) => !isResearching && setQuery(e.target.value)}
              readOnly={isResearching}
              placeholder="Search a dish or ingredient..."
              className={`h-14 w-full rounded-full border border-border bg-card ps-14 text-base text-foreground shadow-sm outline-none placeholder:text-muted-foreground transition-[border-color,box-shadow] duration-200 ${
                isResearching
                  ? 'cursor-default pr-12'
                  : 'pr-5 focus:border-primary/40 focus:ring-2 focus:ring-primary/15'
              }`}
            />
            {isResearching && (
              <button
                type="button"
                onClick={handleReset}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                <RefreshCcw className="size-4" />
              </button>
            )}
          </div>
        </form>

        {/* Research results */}
        {isResearching && (
          <>
            {/* Error */}
            {state.error && (
              <div className="mb-6 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                {state.error}
              </div>
            )}

            {/* Timeline */}
            {state.stage !== 'idle' && (
              <div className="mb-8 rounded-xl border bg-card p-5 shadow-sm">
                <ResearchTimeline progress={timelineProgress} />
              </div>
            )}

            {/* Report */}
            {state.report && (
              <div className="rounded-xl border bg-card p-6 shadow-sm">
                <ReportView
                  report={state.report}
                  sources={state.citedSources}
                />
                <SourcesList sources={state.citedSources} />
              </div>
            )}
          </>
        )}
      </div>
    </main>
  )
}
