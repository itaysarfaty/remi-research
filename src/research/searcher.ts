import { generateText, Output } from 'ai'
import { openai } from '@ai-sdk/openai'
import { z } from 'zod/v4'
import { SEARCH_QUERY_SYSTEM } from './prompts.ts'
import * as tavilyClient from './tavily-client.ts'
import type {
  ResearchPlan,
  SearchBatch,
  ResearchSource,
  ResearchEvent,
} from '@/types'

const queryBatchesSchema = z.object({
  batches: z.array(
    z.object({
      label: z.string(),
      queries: z.array(z.string()),
    }),
  ),
})

export async function runSearcher(
  plan: ResearchPlan,
  emit: (event: ResearchEvent) => void,
): Promise<ResearchSource[]> {
  // Generate search queries
  const topicsSummary = plan.topics
    .map((t) => `[${t.section}] ${t.topic}: ${t.description}`)
    .join('\n')

  const { output } = await generateText({
    model: openai('gpt-4o-mini'),
    system: SEARCH_QUERY_SYSTEM,
    prompt: `Generate search queries for research on "${plan.query}".\n\nTopics:\n${topicsSummary}`,
    output: Output.object({ schema: queryBatchesSchema }),
  })

  // Search in batches
  const allUrls = new Map<
    string,
    { title: string; url: string; score: number }
  >()

  for (let i = 0; i < output.batches.length; i++) {
    const batch = output.batches[i]
    const searchBatch: SearchBatch = {
      batchIndex: i,
      label: batch.label,
      queries: batch.queries,
    }
    emit({ type: 'search-batch', batch: searchBatch })

    const results = await Promise.all(
      batch.queries.map((q) =>
        tavilyClient
          .search(q, { maxResults: 5, searchDepth: 'advanced' })
          .catch(() => ({
            results: [] as Array<{
              url: string
              title: string
              score: number
            }>,
          })),
      ),
    )

    const batchNewUrls: Array<{ url: string; title: string }> = []

    for (const result of results) {
      for (const r of result.results) {
        const existing = allUrls.get(r.url)
        if (!existing) {
          allUrls.set(r.url, { title: r.title, url: r.url, score: r.score })
          batchNewUrls.push({ url: r.url, title: r.title })
        } else if (r.score > existing.score) {
          existing.score = r.score
        }
      }
    }

    emit({ type: 'batch-urls', batchIndex: i, urls: batchNewUrls })
  }

  emit({ type: 'search-results', count: allUrls.size })

  // Rank by Tavily relevance score and take the top sources
  const rankedUrls = [...allUrls.values()].sort((a, b) => b.score - a.score)
  const urlsToExtract = rankedUrls.slice(0, 20)
  emit({ type: 'stage', stage: 'extracting' })

  const extractedSources: ResearchSource[] = []

  // Extract in chunks of 5
  const chunks: (typeof urlsToExtract)[] = []
  for (let i = 0; i < urlsToExtract.length; i += 5) {
    chunks.push(urlsToExtract.slice(i, i + 5))
  }

  for (const chunk of chunks) {
    try {
      const extracted = await tavilyClient.extract(chunk.map((u) => u.url))

      for (const result of extracted.results) {
        const meta = allUrls.get(result.url)
        extractedSources.push({
          index: extractedSources.length + 1,
          url: result.url,
          title: meta?.title ?? result.url,
          content: result.rawContent,
        })
      }
    } catch {
      // Skip failed extractions
    }

    emit({
      type: 'extraction-progress',
      extracted: extractedSources.length,
      total: urlsToExtract.length,
    })
  }

  return extractedSources
}
