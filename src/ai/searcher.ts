import { generateText, Output } from 'ai'
import { openai } from '@ai-sdk/openai'
import { tavily } from '@tavily/core'
import { z } from 'zod/v4'
import { SEARCH_QUERY_SYSTEM } from './prompts.ts'
import { env } from '@/env.ts'
import { getCachedEntry } from './tavily-cache.ts'
import type {
  ResearchPlan,
  SearchBatch,
  ResearchSource,
  ResearchEvent,
} from '@/types'

const tavilyClient = tavily({ apiKey: env.TAVILY_API_KEY })

const queryBatchesSchema = z.object({
  batches: z.array(
    z.object({
      label: z.string(),
      queries: z.array(z.string()),
    }),
  ),
})

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function runSearcherFromCache(
  query: string,
  emit: (event: ResearchEvent) => void,
): Promise<ResearchSource[]> {
  const entry = await getCachedEntry(query)
  if (!entry) return []

  for (const batch of entry.searchBatches) {
    emit({ type: 'search-batch', batch })
    await sleep(300)

    const batchUrl = entry.batchUrls.find(
      (b) => b.batchIndex === batch.batchIndex,
    )
    if (batchUrl) {
      emit({
        type: 'batch-urls',
        batchIndex: batchUrl.batchIndex,
        urls: batchUrl.urls,
      })
    }
    await sleep(200)
  }

  emit({ type: 'search-results', count: entry.searchResultsCount })
  emit({ type: 'stage', stage: 'extracting' })

  const total = entry.sources.length
  const chunkSize = 5
  for (let i = 0; i < total; i += chunkSize) {
    await sleep(100)
    emit({
      type: 'extraction-progress',
      extracted: Math.min(i + chunkSize, total),
      total,
    })
  }

  return entry.sources
}

export async function runSearcher(
  plan: ResearchPlan,
  emit: (event: ResearchEvent) => void,
): Promise<ResearchSource[]> {
  if (env.USE_TAVILY_CACHE === 'true') {
    return runSearcherFromCache(plan.query, emit)
  }

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
          // Keep the highest score for this URL
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
