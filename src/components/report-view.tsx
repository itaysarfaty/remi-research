import Markdown from 'react-markdown'
import { motion } from 'framer-motion'
import type { ResearchSource } from '../types.ts'

interface ReportViewProps {
  report: string
  sources: ResearchSource[]
}

export function ReportView({ report, sources }: ReportViewProps) {
  if (!report) return null

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.0, 0.0, 0.2, 1] }}
      className="border border-border"
    >
      <div className="border-b border-border px-5 py-2.5 bg-card">
        <span className="text-sm font-medium text-foreground">
          Report
        </span>
      </div>
      <article className="report-prose px-5 py-5">
        <Markdown
          components={{
            p: ({ children, ...props }) => (
              <p {...props}>{transformCitations(children, sources)}</p>
            ),
            li: ({ children, ...props }) => (
              <li {...props}>
                {transformCitations(children, sources)}
              </li>
            ),
          }}
        >
          {report}
        </Markdown>
      </article>
    </motion.div>
  )
}

function transformCitations(
  children: React.ReactNode,
  sources: ResearchSource[],
): React.ReactNode {
  if (!children) return children

  if (typeof children === 'string') {
    return transformCitationString(children, sources)
  }

  if (Array.isArray(children)) {
    return children.map((child, i) => {
      if (typeof child === 'string') {
        return <span key={i}>{transformCitationString(child, sources)}</span>
      }
      return child
    })
  }

  return children
}

function transformCitationString(
  text: string,
  sources: ResearchSource[],
): React.ReactNode {
  const parts = text.split(/(\[\d+\])/)

  if (parts.length === 1) return text

  return parts.flatMap((part, i, arr) => {
    const match = part.match(/^\[(\d+)\]$/)
    if (!match) {
      const prevIsCitation = i > 0 && /^\[\d+\]$/.test(arr[i - 1])
      const nextIsCitation = i < arr.length - 1 && /^\[\d+\]$/.test(arr[i + 1])
      if (prevIsCitation && nextIsCitation && /^[\s,;]+$/.test(part)) return [' ']
      return [part]
    }

    const num = parseInt(match[1], 10)
    const source = sources.find((s) => s.index === num)

    return (
      <a
        key={i}
        href={source?.url}
        target="_blank"
        rel="noopener noreferrer"
        className="citation-badge"
        title={source?.title}
      >
        {num}
      </a>
    )
  })
}
