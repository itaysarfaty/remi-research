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
    <div className="mt-8 border-t pt-6">
      <h3 className="text-sm font-semibold text-foreground mb-3">Sources</h3>
      <ol className="space-y-2">
        {sources.map((source) => (
          <li
            key={source.index}
            id={`source-${source.index}`}
            className="flex items-baseline gap-2 text-sm"
          >
            <span className="shrink-0 text-xs font-medium text-muted-foreground w-5 text-right">
              {source.index}.
            </span>
            <div className="min-w-0">
              <a
                href={source.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:text-primary/80 transition-colors underline underline-offset-2 decoration-primary/30 hover:decoration-primary/70"
              >
                {source.title}
              </a>
              <span className="text-xs text-muted-foreground ml-1.5">
                {getDomain(source.url)}
              </span>
            </div>
          </li>
        ))}
      </ol>
    </div>
  )
}
