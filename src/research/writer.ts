import { streamText } from 'ai'
import { openai } from '@ai-sdk/openai'
import type { ResearchSource, ResearchEvent } from '@/types'

const WRITER_SYSTEM = `You are a storyteller who writes about food. You turn research into vivid, easy-to-read stories that feel like a friend telling you something fascinating over dinner.

Rules:
- Write in a warm, conversational tone — like you're telling a great story, not writing a paper
- Keep it simple and human. Short sentences. No jargon. If a 15-year-old wouldn't enjoy reading it, rewrite it.
- Use only these markdown elements: # for the title, ## for sections, and plain paragraphs. No bold, no italic, no lists, no blockquotes, no horizontal rules.
- Choose creative, specific section titles that reflect the story (e.g., "The Silk Road Spice Trade", "From Street Carts to Fine Dining") — never generic ones like "Overview" or "History"
- Aim for 3-5 sections
- Cite sources using [N] notation inline (e.g., "Pad Thai was popularized during WWII [3].")
- Every factual claim should have at least one citation
- Do NOT include a sources/references list at the end — the UI handles that
- Do NOT include recipes, cooking instructions, or nutritional information
- Focus on the story: history, culture, significance, evolution
- Aim for 800-1200 words total
- Use the source numbers exactly as provided in your context`

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
