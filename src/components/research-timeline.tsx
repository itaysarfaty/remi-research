import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from './ui/dialog.tsx'
import type {
  TimelineProgress,
  SearchBatchDisplay,
  StepStatus,
} from '../types.ts'

interface ResearchTimelineProps {
  progress: TimelineProgress
  hasReport: boolean
}

const easeOut = [0.0, 0.0, 0.2, 1] as const

/* ── Scanning line indicator ── */

function ScanIndicator({ status }: { status: StepStatus }) {
  if (status !== 'active') return null

  return (
    <div className="relative w-12 h-[3px] overflow-hidden ml-auto">
      <div className="absolute inset-0 bg-border/40" />
      <motion.div
        className="absolute top-0 h-full w-4 bg-foreground"
        animate={{ left: ['0%', '66%', '0%'] }}
        transition={{
          duration: 1.6,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />
    </div>
  )
}

/* ── Single batch row: label + inline favicons ── */

const MAX_FAVICONS = 5

function BatchRow({ batch, index }: { batch: SearchBatchDisplay; index: number }) {
  const [dialogOpen, setDialogOpen] = useState(false)
  const isLoading = batch.sites === null
  const sites = batch.sites ?? []
  const visible = sites.slice(0, MAX_FAVICONS)
  const overflow = sites.length - MAX_FAVICONS

  return (
    <>
      <motion.div
        className="flex items-center gap-3 px-5 py-2 border-b border-border last:border-b-0"
        initial={{ opacity: 0, x: -8 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.25, delay: index * 0.05, ease: easeOut }}
      >
        <span className="text-sm text-muted-foreground truncate min-w-0">
          {batch.label}
        </span>

        <div className="flex items-center gap-1 shrink-0 ml-auto">
          {isLoading &&
            [0, 1, 2].map((i) => (
              <div
                key={`s-${i}`}
                className="size-[18px] overflow-hidden"
              >
                <div className="size-full animate-shimmer" />
              </div>
            ))}

          {visible.map((site, i) => (
            <motion.a
              key={site.domain}
              href={site.url}
              target="_blank"
              rel="noopener noreferrer"
              title={site.title || site.domain.replace('www.', '')}
              className="size-[18px] bg-muted/40 flex items-center justify-center"
              initial={{ opacity: 0, scale: 0.7 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.2, delay: i * 0.04, ease: easeOut }}
            >
              <img
                src={`https://www.google.com/s2/favicons?domain=${site.domain}&sz=32`}
                alt=""
                className="size-[10px]"
              />
            </motion.a>
          ))}

          {overflow > 0 && (
            <motion.button
              type="button"
              onClick={() => setDialogOpen(true)}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors pl-0.5"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.2, delay: visible.length * 0.04 }}
            >
              +{overflow}
            </motion.button>
          )}
        </div>
      </motion.div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-sm">{batch.label}</DialogTitle>
            <DialogDescription>{sites.length} sources</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-0 max-h-80 overflow-y-auto -mx-2 px-2">
            {sites.map((site) => (
              <a
                key={site.domain}
                href={site.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2.5 px-3 py-2 hover:bg-muted/60 transition-colors no-underline border-b border-border/30 last:border-0"
              >
                <img
                  src={`https://www.google.com/s2/favicons?domain=${site.domain}&sz=32`}
                  alt=""
                  className="size-4 shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <div className="text-sm text-foreground truncate">
                    {site.title || site.domain.replace('www.', '')}
                  </div>
                  <div className="text-sm text-muted-foreground truncate">
                    {site.domain.replace('www.', '')}
                  </div>
                </div>
              </a>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

/* ── Main ── */

export function ResearchTimeline({ progress, hasReport }: ResearchTimelineProps) {
  const { steps, planSummary, searchBatches } = progress

  const planStep = steps.find((s) => s.key === 'planning')!
  const searchStep = steps.find((s) => s.key === 'searching')!
  const writingStep = steps.find((s) => s.key === 'writing')!

  const showPlanning = planStep.status !== 'pending'
  const showSearching = searchStep.status !== 'pending'
  const showWriting = writingStep.status === 'active' && !hasReport

  const planLines = planSummary?.split('\n').filter(Boolean) ?? []

  return (
    <div className="space-y-4">
      {/* ── Planning ── */}
      <AnimatePresence>
        {showPlanning && (
          <motion.div
            key="planning"
            className="border border-border overflow-hidden"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            transition={{ duration: 0.35, ease: easeOut }}
          >
            <div className={`px-5 py-2.5 flex items-center bg-card ${planLines.length > 0 ? 'border-b border-border' : ''}`}>
              <span className="text-sm font-medium text-foreground">
                {planStep.label}
              </span>
              <ScanIndicator status={planStep.status} />
            </div>

            <AnimatePresence>
              {planLines.length > 0 && (
                <motion.div
                  key="plan-lines"
                  className="px-5 py-3 space-y-1"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.2 }}
                >
                  {planLines.map((line, i) => (
                    <motion.p
                      key={`${i}-${line.slice(0, 20)}`}
                      className="text-sm text-muted-foreground leading-relaxed"
                      initial={{ opacity: 0, y: 6, filter: 'blur(4px)' }}
                      animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                      transition={{ duration: 0.3, delay: i * 0.05, ease: easeOut }}
                    >
                      {line}
                    </motion.p>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Searching ── */}
      <AnimatePresence>
        {showSearching && (
          <motion.div
            key="searching"
            className="border border-border overflow-hidden"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            transition={{ duration: 0.35, ease: easeOut }}
          >
            <div className={`px-5 py-2.5 flex items-center bg-card ${searchBatches.length > 0 ? 'border-b border-border' : ''}`}>
              <span className="text-sm font-medium text-foreground">
                {searchStep.label}
              </span>
              <ScanIndicator status={searchStep.status} />
            </div>

            {searchBatches.length > 0 && (
              <div className="flex flex-col">
                {searchBatches.map((batch, i) => (
                  <BatchRow key={batch.label} batch={batch} index={i} />
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Writing ── */}
      <AnimatePresence>
        {showWriting && (
          <motion.div
            key="writing"
            className="border border-border overflow-hidden"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.35, ease: easeOut }}
          >
            <div className="px-5 py-2.5 flex items-center bg-card">
              <span className="text-sm font-medium text-foreground">
                {writingStep.label}
              </span>
              <ScanIndicator status={writingStep.status} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
