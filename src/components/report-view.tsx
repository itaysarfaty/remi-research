import Markdown from 'react-markdown'
import type { ResearchSource } from '../types.ts'

interface ReportViewProps {
  report: string
  sources: ResearchSource[]
}

export function ReportView({ report, sources }: ReportViewProps) {
  if (!report) return null

  return (
    <div className="chat-markdown">
      <Markdown
        components={{
          // Transform [N] citation patterns into superscript links
          p: ({ children, ...props }) => (
            <p {...props}>{transformCitations(children, sources)}</p>
          ),
          li: ({ children, ...props }) => (
            <li {...props}>{transformCitations(children, sources)}</li>
          ),
        }}
      >
        {report}
      </Markdown>
    </div>
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

  return parts.map((part, i) => {
    const match = part.match(/^\[(\d+)\]$/)
    if (!match) return part

    const num = parseInt(match[1], 10)
    const source = sources.find((s) => s.index === num)

    return (
      <sup key={i}>
        <a
          href={source ? `#source-${num}` : undefined}
          className="text-primary hover:text-primary/80 transition-colors text-xs font-medium no-underline"
        >
          [{num}]
        </a>
      </sup>
    )
  })
}
