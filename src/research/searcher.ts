import { generateText, Output } from 'ai'
import { openai } from '@ai-sdk/openai'
import { z } from 'zod/v4'
import * as tavilyClient from '@/lib/tavily-client.ts'
import type {
  ResearchPlan,
  SearchBatch,
  SearchUrl,
  ResearchSource,
} from '@/types'

export interface SearcherCallbacks {
  onBatch: (batch: SearchBatch) => void
  onBatchUrls: (batchIndex: number, urls: SearchUrl[]) => void
  onSearchResults: (count: number) => void
  onStartExtraction: () => void
  onExtractionProgress: (extracted: number, total: number) => void
}

const SEARCH_QUERY_SYSTEM = `You are a search query generator for culinary research. Given a list of research topics about a dish or ingredient, generate web search queries that will find high-quality, informative content.

Rules:
- Generate exactly 4 batches of 8 queries each (32 total)
- Each batch must have a short label (2-4 words) describing the angle it covers (e.g., "Historical origins", "Regional variations", "Cultural significance", "Modern evolution")
- Queries should be specific and varied to maximize coverage
- Include queries targeting historical sources, academic articles, food journalism, and cultural perspectives
- Avoid queries that would primarily return recipes or nutrition information
- Each query should be a natural search string (not boolean operators)`

const queryBatchesSchema = z.object({
  batches: z.array(
    z.object({
      label: z.string(),
      queries: z.array(z.string().max(400)),
    }),
  ),
})

async function runSearcherFromCache(
  plan: ResearchPlan,
  callbacks: SearcherCallbacks,
): Promise<ResearchSource[]> {
  const cached = await tavilyClient.loadCached(plan.query)

  const allUrls = new Map<string, { title: string; url: string; score: number }>()

  for (let i = 0; i < cached.batches.length; i++) {
    const batch = cached.batches[i]

    callbacks.onBatch({
      batchIndex: i,
      label: batch.label,
      queries: batch.queries,
    })

    const batchNewUrls: SearchUrl[] = []

    for (const query of batch.queries) {
      const searchResult = cached.searches[query]
      if (!searchResult) continue

      for (const r of searchResult.results) {
        if (!allUrls.has(r.url)) {
          allUrls.set(r.url, { title: r.title, url: r.url, score: r.score })
          batchNewUrls.push({ url: r.url, title: r.title })
        }
      }
    }

    callbacks.onBatchUrls(i, batchNewUrls)
  }

  callbacks.onSearchResults(allUrls.size)
  callbacks.onStartExtraction()

  const extractions = Object.values(cached.extractions)
  const sources: ResearchSource[] = extractions.map((r, i) => {
    const meta = allUrls.get(r.url)
    return {
      index: i + 1,
      url: r.url,
      title: meta?.title ?? r.url,
      content: r.rawContent,
    }
  })

  callbacks.onExtractionProgress(sources.length, sources.length)

  return sources
}

export async function runSearcher(
  plan: ResearchPlan,
  callbacks: SearcherCallbacks,
): Promise<ResearchSource[]> {
  if (tavilyClient.useCache) {
    return runSearcherFromCache(plan, callbacks)
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

  // Cache the batch metadata
  await tavilyClient.cacheBatches(
    plan.query,
    output.batches.map((b) => ({ label: b.label, queries: b.queries })),
  )

  // Search all batches in parallel
  const allUrls = new Map<
    string,
    { title: string; url: string; score: number }
  >()

  const batchResults = await Promise.all(
    output.batches.map(async (batch, i) => {
      const searchBatch: SearchBatch = {
        batchIndex: i,
        label: batch.label,
        queries: batch.queries,
      }
      callbacks.onBatch(searchBatch)

      const results = await Promise.all(
        batch.queries.map((q) =>
          tavilyClient
            .search(plan.query, q, { maxResults: 5, searchDepth: 'advanced' })
            .catch(() => ({
              results: [] as Array<{
                url: string
                title: string
                score: number
              }>,
            })),
        ),
      )

      return { batchIndex: i, results }
    }),
  )

  for (const { batchIndex, results } of batchResults) {
    const batchNewUrls: SearchUrl[] = []

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

    callbacks.onBatchUrls(batchIndex, batchNewUrls)
  }

  callbacks.onSearchResults(allUrls.size)

  // Rank by Tavily relevance score, filter low-relevance, take top sources
  const rankedUrls = [...allUrls.values()]
    .filter((u) => u.score > 0.5)
    .sort((a, b) => b.score - a.score)
  const urlsToExtract = rankedUrls.slice(0, 20)
  callbacks.onStartExtraction()

  const extractedSources: ResearchSource[] = []

  // Extract in chunks of 5
  const chunks: (typeof urlsToExtract)[] = []
  for (let i = 0; i < urlsToExtract.length; i += 5) {
    chunks.push(urlsToExtract.slice(i, i + 5))
  }

  for (const chunk of chunks) {
    try {
      // NOTE: extract response also contains failed_results for individual URL failures
      const extracted = await tavilyClient.extract(plan.query, chunk.map((u) => u.url))

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

    callbacks.onExtractionProgress(extractedSources.length, urlsToExtract.length)
  }

  return extractedSources
}
