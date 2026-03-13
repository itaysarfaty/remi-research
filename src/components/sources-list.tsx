import { motion } from 'framer-motion'
import type { ResearchSource } from '../types.ts'

interface SourcesListProps {
  sources: ResearchSource[]
}

function getDomain(url: string): string {
  try {
    return new URL(url).hostname.replace('www.', '')
  } catch {
    return url
  }
}

export function SourcesList({ sources }: SourcesListProps) {
  if (sources.length === 0) return null

  return (
    <motion.div
      className="mt-6"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: 0.1, ease: [0.0, 0.0, 0.2, 1] }}
    >
      <div className="border border-border">
        {/* Header */}
        <div className="border-b border-border px-5 py-2.5 flex items-center justify-between bg-card">
          <span className="text-sm font-medium text-foreground">
            Sources
          </span>
          <span className="text-sm font-mono text-muted-foreground tabular-nums">
            {sources.length}
          </span>
        </div>

        {/* Grid */}
        <div className="flex flex-col max-h-80 overflow-y-auto scrollbar-none">
          {sources.map((source, i) => (
            <motion.a
              key={source.index}
              id={`source-${source.index}`}
              href={source.url}
              target="_blank"
              rel="noopener noreferrer"
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.25, delay: i * 0.03, ease: [0.0, 0.0, 0.2, 1] }}
              className="flex gap-3 px-5 py-3 no-underline border-b border-border hover:bg-muted/30 transition-colors last:border-b-0"
            >
              <span className="text-sm font-mono text-muted-foreground tabular-nums shrink-0">
                {source.index}
              </span>
              <div className="min-w-0">
                <div className="text-sm text-foreground truncate">
                  {source.title}
                </div>
                <div className="text-sm text-muted-foreground truncate mt-0.5">
                  {getDomain(source.url)}
                </div>
              </div>
            </motion.a>
          ))}
        </div>
      </div>
    </motion.div>
  )
}
