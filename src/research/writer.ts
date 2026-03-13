import { streamText } from 'ai'
import { openai } from '@ai-sdk/openai'
import { WRITER_SYSTEM } from './prompts.ts'
import type { ResearchSource, ResearchEvent } from '@/types'

export async function runWriter(
  query: string,
  sources: ResearchSource[],
  emit: (event: ResearchEvent) => void,
): Promise<void> {
  const sourceContext = sources
    .map(
      (s) =>
        `[${s.index}] Title: "${s.title}" | URL: ${s.url}\nContent: ${s.content}`,
    )
    .join('\n\n---\n\n')

  const result = streamText({
    model: openai('gpt-5.2'),
    system: `${WRITER_SYSTEM}\n\n--- SOURCE MATERIAL ---\n\n${sourceContext}`,
    prompt: `Write a comprehensive research report about: "${query}"`,
  })

  let fullReport = ''

  for await (const delta of result.textStream) {
    fullReport += delta
    emit({ type: 'report-delta', delta })
  }

  // Parse cited source numbers from the report
  const citedNumbers = new Set<number>()
  const citationPattern = /\[(\d+)\]/g
  let match

  while ((match = citationPattern.exec(fullReport)) !== null) {
    citedNumbers.add(parseInt(match[1], 10))
  }

  // Emit only the cited sources
  const citedSources = sources.filter((s) => citedNumbers.has(s.index))
  emit({ type: 'sources', sources: citedSources })
}
