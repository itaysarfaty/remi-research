import { tavily } from '@tavily/core'
import { env } from '@/env'
import {
  load,
  persist,
  type TavilySearchResult,
  type TavilyExtractResult,
  type TavilyCacheEntry,
  type CachedBatch,
} from '@/lib/tavily-cache'

export const useCache = env.USE_TAVILY_CACHE === 'true'

const client = tavily({ apiKey: env.TAVILY_API_KEY })

export async function loadCached(term: string): Promise<TavilyCacheEntry> {
  return load(term)
}

export async function cacheBatches(
  term: string,
  batches: CachedBatch[],
): Promise<void> {
  const data = await load(term)
  data.batches = batches
  await persist()
}

export async function search(
  term: string,
  query: string,
  options?: { maxResults?: number; searchDepth?: 'basic' | 'advanced' },
): Promise<TavilySearchResult> {
  const result = await client.search(query, options)

  const data = await load(term)
  data.searches[query] = result as TavilySearchResult
  await persist()

  return result as TavilySearchResult
}

export async function extract(
  term: string,
  urls: string[],
): Promise<TavilyExtractResult> {
  // TODO: consider using extractDepth: 'advanced' for JS-rendered pages
  const result = await client.extract(urls)

  const data = await load(term)
  for (const r of result.results) {
    data.extractions[r.url] = r as TavilyExtractResult['results'][number]
  }
  await persist()

  return result as TavilyExtractResult
}
