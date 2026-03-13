import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { ArrowRight, type LucideIcon, RefreshCcw, Square } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useResearch } from '@/hooks/use-research'
import { ResearchTimeline } from '@/components/research-timeline'
import { ReportView } from '@/components/report-view'
import { SourcesList } from '@/components/sources-list'

export const Route = createFileRoute('/')({ component: App })

const easeOut = [0.0, 0.0, 0.2, 1] as const
const layoutTransition = { duration: 0.5, ease: easeOut }

function InputAction({
  icon: Icon,
  iconClassName,
  ...props
}: { icon: LucideIcon; iconClassName?: string } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <motion.button
      {...props}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      transition={{ duration: 0.15 }}
      className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-muted-foreground hover:text-foreground transition-colors"
    >
      <Icon className={`size-3.5 ${iconClassName ?? ''}`} />
    </motion.button>
  )
}

function App() {
  const [query, setQuery] = useState('')
  const [submittedQuery, setSubmittedQuery] = useState<string | null>(null)
  const [searchKey, setSearchKey] = useState(0)
  const { state, timelineProgress } = useResearch(submittedQuery, searchKey)

  const isResearching = submittedQuery !== null
  const isRunning =
    isResearching && state.stage !== 'complete' && state.stage !== 'error'

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
    <motion.main
      layout="position"
      className={`grid-bg ${
        isResearching
          ? 'min-h-svh px-4 py-8'
          : 'flex min-h-svh flex-col items-center justify-center px-4 pb-24'
      }`}
      transition={layoutTransition}
    >
      <motion.div
        layout="position"
        className={isResearching ? 'mx-auto max-w-2xl' : 'w-full max-w-xl'}
        transition={layoutTransition}
      >
        {/* Header */}
        <AnimatePresence mode="popLayout">
          {!isResearching && (
            <motion.div
              key="header"
              layout
              className="mb-6 flex items-center gap-3"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.25, ease: easeOut }}
            >
              <img
                src="/remi-logo.svg"
                alt="Remi"
                className="size-6"
              />
              <div className="h-px flex-1 bg-border" />
              <span className="text-sm text-muted-foreground">
                Research
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Search bar */}
        <motion.form
          layout="position"
          onSubmit={handleSubmit}
          className={isResearching ? 'mb-10' : ''}
          transition={layoutTransition}
        >
          <motion.div layout="position" className="group relative" transition={layoutTransition}>
            <AnimatePresence>
              {isResearching && (
                <motion.img
                  key="search-logo"
                  src="/remi-logo.svg"
                  alt="Remi"
                  className="absolute left-3 top-1/2 size-5 -translate-y-1/2"
                  initial={{ opacity: 0, scale: 0.6 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.6 }}
                  transition={{ duration: 0.2, ease: easeOut }}
                />
              )}
            </AnimatePresence>
            <input
              type="text"
              value={query}
              onChange={(e) => !isResearching && setQuery(e.target.value)}
              readOnly={isResearching}
              placeholder="Search a dish or ingredient..."
              className={`h-12 w-full border border-border bg-card text-sm text-foreground outline-none placeholder:text-muted-foreground transition-[border-color,padding] duration-300 ${
                isResearching
                  ? 'cursor-default pl-10 pr-12'
                  : `${query.trim() ? 'pr-12' : 'pr-4'} pl-4 focus:border-muted-foreground/40`
              }`}
            />
            <AnimatePresence mode="wait">
              {!isResearching && query.trim() && (
                <InputAction key="submit" type="submit" title="Search" icon={ArrowRight} />
              )}
              {isResearching &&
                (isRunning ? (
                  <InputAction key="abort" type="button" title="Abort" onClick={handleReset} icon={Square} iconClassName="fill-current" />
                ) : (
                  <InputAction key="reset" type="button" title="Reset" onClick={handleReset} icon={RefreshCcw} />
                ))}
            </AnimatePresence>
          </motion.div>
        </motion.form>

        {/* Research results */}
        <AnimatePresence>
          {isResearching && (
            <motion.div
              key="results"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              {/* Error */}
              <AnimatePresence>
                {state.error && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.25, ease: easeOut }}
                    className="mb-6 overflow-hidden"
                  >
                    <div className="border-l-2 border-destructive/40 px-4 py-3 text-sm text-destructive">
                      {state.error}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Timeline */}
              <AnimatePresence>
                {state.stage !== 'idle' && (
                  <motion.div
                    key="timeline"
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.35, delay: 0.5, ease: easeOut }}
                  >
                    <ResearchTimeline progress={timelineProgress} hasReport={!!state.report} />
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Report + sources */}
              <AnimatePresence>
                {state.report && (
                  <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, ease: easeOut }}
                    className="mt-8"
                  >
                    <ReportView
                      report={state.report}
                      sources={state.citedSources}
                    />
                    <SourcesList sources={state.citedSources} />
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.main>
  )
}
